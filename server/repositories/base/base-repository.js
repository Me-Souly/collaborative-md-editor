class BaseRepository {
    async findOneBy(_filter) {
        throw new Error('Not implemented');
    }
    async findBy(_filter) {
        throw new Error('Not implemented');
    }
    async findById(_id) {
        throw new Error('Not implemented');
    }
    async create(_data) {
        throw new Error('Not implemented');
    }
    async updateByIdAtomic(_id, _updateData, _options) {
        throw new Error('Not implemented');
    }
    async updateOneAtomic(_filter, _updateData, _options) {
        throw new Error('Not implemented');
    }
    async upsertOneAtomic(_filter, _data, _options) {
        throw new Error('Not implemented');
    }
    async save(_entity) {
        throw new Error('Not implemented');
    }
    async softDelete(_id) {
        throw new Error('Not implemented');
    }
    async findAll() {
        throw new Error('Not implemented');
    }
    async deleteById(_id) {
        throw new Error('Not implemented');
    }
    async deleteOne(_filter) {
        throw new Error('Not implemented');
    }
    async deleteMany(_filter) {
        throw new Error('Not implemented');
    }
    async count(_filter) {
        throw new Error('Not implemented');
    }
}

export default BaseRepository;
