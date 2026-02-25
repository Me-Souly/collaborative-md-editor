import BaseRepository from './base-repository.js';

class RoleRepository extends BaseRepository {
    async findByName(_name) {
        throw new Error('Not implemented');
    }
}

export default RoleRepository;
