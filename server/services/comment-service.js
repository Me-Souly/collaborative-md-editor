import ApiError from '../exceptions/api-error.js';
import { commentRepository } from '../repositories/index.js';
import CommentDto from '../dtos/comment-dto.js';

class CommentService {
    async create(noteId, authorId, content, parentId = null) {
        if (!content?.trim()) throw new ApiError.BadRequest("Content cannot be empty");

        const created = await commentRepository.create({
            noteId,
            authorId,
            parentId,
            content: content.trim(),
        });

        return new CommentDto(created, authorId);
    }

    async getCommentsByNote(noteId, currentUserId) {
        const comments = await commentRepository.getCommentsByNote(noteId);
        return comments.map(c => new CommentDto(c, currentUserId));
    }

    async getReplies(parentId, currentUserId) {
        const replies = await commentRepository.getReplies(parentId);
        return replies.map(r => new CommentDto(r, currentUserId));
    }

    async delete(commentId) {
        return commentRepository.softDelete(commentId);
    }

    async toggleReaction(commentId, userId, reactionType) {
        const updated = await commentRepository.toggleReaction(commentId, userId, reactionType);
        return new CommentDto(updated, userId);
    }

}

export default new CommentService();
