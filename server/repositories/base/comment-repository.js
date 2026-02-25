import BaseRepository from './base-repository.js';

class CommentRepository extends BaseRepository {
    async getCommentsByNote(_noteId) {
        throw new Error('Not implemented');
    }
    async getReplies(_parentId) {
        throw new Error('Not implemented');
    }
    async toggleReaction(_commentId, _userId, _reactionType) {
        throw new Error('Not implemented');
    }
}

export default CommentRepository;
