import { InlineCommentModel } from '../../models/mongo/index.js';
import { InlineCommentRepository } from '../base/index.js';
import MongoBaseRepository from './mongo-base-repository.js';

class MongoInlineCommentRepository extends InlineCommentRepository {
    constructor() {
        super();
        this.mongo = new MongoBaseRepository(InlineCommentModel);
    }

    async findOneBy(filter) { return this.mongo.findOneBy(filter); }
    async findBy(filter)    { return this.mongo.findBy(filter); }
    async findById(id)      { return this.mongo.findById(id); }
    async create(data) {
        const created = await this.mongo.create(data);
        // No .lean() — we need a real Mongoose document so Buffer fields stay as Buffer,
        // not as MongoDB Binary objects which break Buffer.from() conversion in DTO.
        return InlineCommentModel.findById(created._id)
            .populate('authorId', 'login name avatar');
    }
    async save(entity)      { return this.mongo.save(entity); }
    async updateByIdAtomic(id, updateData, options) { return this.mongo.updateByIdAtomic(id, updateData, options); }
    async updateOneAtomic(filter, updateData, options) { return this.mongo.updateOneAtomic(filter, updateData, options); }

    /**
     * Все inline-комментарии к заметке (только неудалённые), с populate автора
     */
    async getByNote(noteId) {
        return InlineCommentModel.find({ noteId, isDeleted: false })
            .populate('authorId', 'login name avatar')
            .sort({ createdAt: 1 })
            .lean();
    }

    /**
     * Только неразрешённые inline-комментарии к заметке
     */
    async getUnresolved(noteId) {
        return InlineCommentModel.find({ noteId, isResolved: false, isDeleted: false })
            .populate('authorId', 'login name avatar')
            .sort({ createdAt: 1 })
            .lean();
    }

    /**
     * Пометить комментарий как решённый
     */
    async resolve(commentId) {
        return InlineCommentModel.findByIdAndUpdate(
            commentId,
            { $set: { isResolved: true } },
            { new: true }
        ).populate('authorId', 'login name avatar').lean();
    }

    /**
     * Мягкое удаление: первый раз — скрыть, второй — удалить физически
     */
    async softDelete(commentId) {
        const comment = await InlineCommentModel.findById(commentId);
        if (!comment) return { status: 'notFound' };

        if (comment.isDeleted) {
            await InlineCommentModel.deleteOne({ _id: commentId });
            return { status: 'permanentlyDeleted' };
        }

        comment.isDeleted = true;
        comment.content = '[deleted]';
        await comment.save();
        return { status: 'softDeleted' };
    }

    /**
     * Добавление/смена/удаление реакции пользователя (атомарный array toggle)
     */
    async toggleReaction(commentId, userId, reactionType) {
        const comment = await InlineCommentModel.findById(commentId);
        if (!comment) throw new Error('InlineComment not found');

        const existing = comment.reactions.find(r => String(r.userId) === String(userId));

        if (existing) {
            if (existing.type === reactionType) {
                // повторный клик — убрать реакцию
                comment.reactions = comment.reactions.filter(r => String(r.userId) !== String(userId));
            } else {
                existing.type = reactionType;
            }
        } else {
            comment.reactions.push({ userId, type: reactionType });
        }

        await comment.save();
        return comment;
    }
}

export default MongoInlineCommentRepository;
