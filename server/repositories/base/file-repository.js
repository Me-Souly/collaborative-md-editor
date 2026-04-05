import BaseRepository from './base-repository.js';

class FileRepository extends BaseRepository {
    async findByNoteId(noteId) {
        throw new Error('Not implemented');
    }

    async getTotalSizeByUser(userId) {
        throw new Error('Not implemented');
    }
}

export default FileRepository;
