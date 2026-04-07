import BaseRepository from './base-repository.js';

class InlineCommentRepository extends BaseRepository {
  async getByNote(_noteId) {
    throw new Error('Not implemented');
  }
  async getUnresolved(_noteId) {
    throw new Error('Not implemented');
  }
  async resolve(_commentId) {
    throw new Error('Not implemented');
  }
  async softDelete(_commentId) {
    throw new Error('Not implemented');
  }
  async toggleReaction(_commentId, _userId, _reactionType) {
    throw new Error('Not implemented');
  }
}

export default InlineCommentRepository;
