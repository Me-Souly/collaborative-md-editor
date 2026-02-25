import BaseRepository from './base-repository.js';

class UserRepository extends BaseRepository {
    async findByActivationLink(_activationLink) {
        throw new Error('Not implemented');
    }
    async findAll() {
        throw new Error('Not implemented');
    }
    async isFieldUnique(_field, _value, _excludeUserId) {
        throw new Error('Not implemented');
    }
}

export default UserRepository;
