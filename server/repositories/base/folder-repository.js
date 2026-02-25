import BaseRepository from './base-repository.js';

class FolderRepository extends BaseRepository {
    async findByNote(_noteId) {
        throw new Error('Not implemented');
    }
    async findByParent(_parentId) {
        throw new Error('Not implemented');
    }
}

export default FolderRepository;
