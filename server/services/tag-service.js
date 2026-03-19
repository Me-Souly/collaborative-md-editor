import ApiError from '../exceptions/api-error.js';
import { tagRepository, noteRepository } from '../repositories/index.js';

const toSlug = (str) => {
    let slug = str.trim().toLowerCase()
        .replace(/[\s_-]+/g, '-')
        .replace(/^-+|-+$/g, '');
    // If slug is empty (e.g. only special characters), use encodeURIComponent fallback
    if (!slug) slug = encodeURIComponent(str.trim().toLowerCase());
    return slug;
};

class TagService {
    async getAllTags() {
        return tagRepository.findBy({});
    }

    async findOrCreate(name) {
        const trimmed = name.trim().toLowerCase();
        if (!trimmed) throw ApiError.BadRequest('Tag name cannot be empty');

        const existing = await tagRepository.findByName(trimmed);
        if (existing) return existing;

        const slug = toSlug(trimmed);
        try {
            return await tagRepository.create({ name: trimmed, slug });
        } catch (err) {
            // Duplicate key — another request created this tag concurrently
            if (err.code === 11000) {
                const found = await tagRepository.findByName(trimmed);
                if (found) return found;
            }
            throw ApiError.BadRequest(`Failed to create tag "${trimmed}"`);
        }
    }

    async syncNoteTags(noteId, tagNames, userId) {
        const note = await noteRepository.findById(noteId);
        if (!note) throw ApiError.NotFoundError('Note not found');
        if (note.isDeleted) throw ApiError.BadRequest('Cannot tag deleted note');
        if (note.ownerId.toString() !== userId.toString()) {
            throw ApiError.ForbiddenError('Only the owner can update tags');
        }

        const tags = await Promise.all(
            (tagNames || []).map((name) => this.findOrCreate(name)),
        );
        const tagIds = tags.map((t) => t._id);

        await noteRepository.updateByIdAtomic(noteId, { tags: tagIds });
        return tags.map((t) => ({ id: t._id, name: t.name, slug: t.slug }));
    }
}

export default new TagService();
