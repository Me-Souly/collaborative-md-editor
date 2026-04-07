import ApiError from '../exceptions/api-error.js';
import { inlineCommentRepository, noteRepository } from '../repositories/index.js';
import InlineCommentDto from '../dtos/inline-comment-dto.js';
import notificationService from './notification-service.js';

class InlineCommentService {
    /**
     * Создать inline-комментарий с Yjs-якорем
     * @param {string} noteId
     * @param {string} authorId
     * @param {{ content: string, yjsAnchor: string, anchorText?: string }} body
     */
    async create(noteId, authorId, { content, yjsAnchor, anchorText }) {
        if (!content?.trim())  throw ApiError.BadRequest('Content cannot be empty');
        if (!yjsAnchor)        throw ApiError.BadRequest('yjsAnchor is required');

        const note = await noteRepository.findById(noteId);
        if (!note || note.isDeleted) throw ApiError.NotFoundError('Note not found');

        // base64 → Buffer (бинарный CRDT-якорь хранится нативно в MongoDB)
        const anchorBuf = Buffer.from(yjsAnchor, 'base64');

        const created = await inlineCommentRepository.create({
            noteId,
            authorId,
            yjsAnchor:  anchorBuf,
            anchorText: anchorText?.trim() || null,
            content:    content.trim(),
        });

        // Уведомить владельца заметки (если автор комментария — не владелец)
        if (String(note.ownerId) !== String(authorId)) {
            await notificationService.create(note.ownerId, 'inline_comment_added', {
                noteId:         note._id,
                noteTitle:      note.title || 'Без названия',
                actorId:        authorId,
                commentId:      created._id,
                commentPreview: content.trim().slice(0, 100),
            });
        }

        return new InlineCommentDto(created, authorId, note.ownerId);
    }

    /**
     * Получить все inline-комментарии к заметке
     */
    async getByNote(noteId, currentUserId) {
        const note = await noteRepository.findById(noteId);
        if (!note || note.isDeleted) throw ApiError.NotFoundError('Note not found');

        const comments = await inlineCommentRepository.getByNote(noteId);
        return comments.map(c => new InlineCommentDto(c, currentUserId, note.ownerId));
    }

    /**
     * Пометить комментарий как решённый (только владелец заметки)
     */
    async resolve(commentId, requesterId) {
        const comment = await inlineCommentRepository.findById(commentId);
        if (!comment) throw ApiError.NotFoundError('Comment not found');

        const note = await noteRepository.findById(comment.noteId);
        if (!note || note.isDeleted) throw ApiError.NotFoundError('Note not found');

        if (String(note.ownerId) !== String(requesterId)) {
            throw ApiError.ForbiddenError('Only note owner can resolve comments');
        }

        const updated = await inlineCommentRepository.resolve(commentId);
        return new InlineCommentDto(updated, requesterId, note.ownerId);
    }

    /**
     * Удалить комментарий (только автор)
     */
    async delete(commentId, requesterId) {
        const comment = await inlineCommentRepository.findById(commentId);
        if (!comment) throw ApiError.NotFoundError('Comment not found');

        if (String(comment.authorId) !== String(requesterId)) {
            throw ApiError.ForbiddenError('Only comment author can delete it');
        }

        return inlineCommentRepository.softDelete(commentId);
    }

    /**
     * Переключить реакцию (добавить / сменить / убрать)
     */
    async toggleReaction(commentId, userId, reactionType) {
        const comment = await inlineCommentRepository.findById(commentId);
        if (!comment) throw ApiError.NotFoundError('Comment not found');

        const note = await noteRepository.findById(comment.noteId);

        const updated = await inlineCommentRepository.toggleReaction(commentId, userId, reactionType);
        return new InlineCommentDto(updated, userId, note?.ownerId);
    }
}

export default new InlineCommentService();
