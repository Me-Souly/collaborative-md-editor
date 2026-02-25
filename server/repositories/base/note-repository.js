import BaseRepository from './base-repository.js';

class NoteRepository extends BaseRepository {
    async incrementViews(_noteId) {
        throw new Error('Not implemented');
    }
    async delete(_noteId) {
        throw new Error('Not implemented');
    }
    async findDeletedByUser(_ownerId) {
        throw new Error('Not implemented');
    }
    async findSharedWithUser(_userId) {
        throw new Error('Not implemented');
    }
    async findPublicWithOwner() {
        throw new Error('Not implemented');
    }
    async searchFuzzy(_filter = {}, _query = '', _options = {}) {
        throw new Error('Not implemented');
    }
    async search(_filter, _textQuery, _options) {
        throw new Error('Not implemented');
    }
}

export default NoteRepository;
