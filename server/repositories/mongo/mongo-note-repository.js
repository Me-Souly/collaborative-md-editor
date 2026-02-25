import { NoteModel } from '../../models/mongo/index.js';
import { NoteRepository } from '../base/index.js';
import MongoBaseRepository from './mongo-base-repository.js';
import levenshtein from 'fast-levenshtein';

// Экранирование спецсимволов regex для предотвращения NoSQL injection
const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

class MongoNoteRepository extends NoteRepository {
    constructor() {
        super();
        this.mongo = new MongoBaseRepository(NoteModel);
        // Экспортируем model для атомарных операций в сервисах
        this.model = NoteModel;
    }

    async findOneBy(filter) {
        return this.mongo.findOneBy(filter);
    }
    async findBy(filter) {
        return this.mongo.findBy(filter);
    }
    async findById(id) {
        return this.mongo.findById(id);
    }
    async create(data) {
        return this.mongo.create(data);
    }
    async save(entity) {
        return this.mongo.save(entity);
    }
    async softDelete(id) {
        return this.mongo.softDelete(id);
    }
    async updateByIdAtomic(id, updateData, options) {
        return this.mongo.updateByIdAtomic(id, updateData, options);
    }
    async updateOneAtomic(filter, updateData, options) {
        return this.mongo.updateOneAtomic(filter, updateData, options);
    }
    async upsertOneAtomic(filter, data, options) {
        return this.mongo.upsertOneAtomic(filter, data, options);
    }

    async delete(noteId) {
        const note = await NoteModel.findById(noteId);

        if (!note) {
            return { status: 'notFound', message: 'Note not found' };
        }

        if (note.isDeleted) {
            await NoteModel.deleteOne({ _id: noteId });
            return { status: 'permanentlyDeleted', message: 'Note permanently deleted' };
        }

        note.isDeleted = true;
        note.deletedAt = new Date();
        await note.save();

        return { status: 'softDeleted', message: 'Note marked as deleted' };
    }

    async findPublicWithOwner() {
        return await NoteModel.find({ isPublic: true, isDeleted: false })
            .populate('ownerId', 'username')
            .lean();
    }

    async findDeletedByUser(ownerId) {
        return await NoteModel.find({ ownerId, isDeleted: true });
    }

    async findSharedWithUser({ userId }) {
        return await NoteModel.find({
            'access.userId': userId,
            isDeleted: false,
        }).lean();
    }

    async incrementViews(noteId) {
        const updated = await NoteModel.findByIdAndUpdate(
            noteId,
            {
                $inc: { 'meta.views': 1 },
                $set: { 'meta.lastViewedAt': new Date() },
            },
            { new: true },
        );
        return updated;
    }

    async searchOwnNotes(userId, query, maxDistance = 3) {
        if (!query || !query.trim()) return [];

        const normalizedQuery = query.toLowerCase().trim();
        const queryWords = normalizedQuery.split(/\s+/).filter(Boolean).map(escapeRegex);

        const regex = new RegExp(queryWords.join('|'), 'i');

        const roughMatches = await NoteModel.find(
            {
                ownerId: userId,
                isDeleted: false,
                $or: [
                    { title: { $regex: regex } },
                    { 'meta.searchableContent': { $regex: regex } },
                ],
            },
            { title: 1, 'meta.searchableContent': 1 },
        ).lean();

        if (!roughMatches.length) return [];

        function isSimilar(str, query, maxDistance = 3, maxRelative = 0.3) {
            if (!str || !query) return false;
            const s = str.toLowerCase();
            const distance = levenshtein.get(s, query);
            const maxLen = Math.max(s.length, query.length);
            const ratio = distance / maxLen;
            return distance <= maxDistance && ratio <= maxRelative;
        }

        return roughMatches.filter((note) => {
            if (isSimilar(note.title || '', normalizedQuery, maxDistance)) return true;

            const words = (note.meta?.searchableContent || '')
                .slice(0, 800)
                .toLowerCase()
                .split(/\s+/);
            return words.some((word) =>
                queryWords.some((q) => isSimilar(word, q, maxDistance, 0.25)),
            );
        });
    }

    async searchPublicNotes(query) {
        const baseFilter = { isPublic: true, isDeleted: false };

        if (!query || !query.trim()) {
            return await NoteModel.find(baseFilter).lean();
        }

        const textQuery = query.trim();

        try {
            // Сначала пробуем текстовый поиск по индексу (title + meta.searchableContent)
            const textResults = await NoteModel.find(
                {
                    ...baseFilter,
                    $text: { $search: textQuery },
                },
                {
                    score: { $meta: 'textScore' },
                },
            )
                .sort({ score: { $meta: 'textScore' } })
                .lean();

            // Если текстовый поиск ничего не нашёл, делаем fallback на обычный regex-поиск
            if (textResults.length > 0) {
                return textResults;
            }

            const escapedQuery = escapeRegex(textQuery);
            const regex = new RegExp(escapedQuery, 'i');
            return await NoteModel.find({
                ...baseFilter,
                $or: [{ title: regex }, { 'meta.searchableContent': regex }],
            }).lean();
        } catch {
            const escapedQuery = escapeRegex(textQuery);
            const regex = new RegExp(escapedQuery, 'i');
            return await NoteModel.find({
                ...baseFilter,
                $or: [{ title: regex }, { 'meta.searchableContent': regex }],
            }).lean();
        }
    }
}

export default MongoNoteRepository;
