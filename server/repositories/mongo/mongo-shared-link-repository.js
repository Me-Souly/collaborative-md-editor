import { SharedLinkModel } from '../../models/mongo/index.js';
import { SharedLinkRepository } from '../base/index.js';
import MongoBaseRepository from './mongo-base-repository.js';

class MongoSharedLinkRepository extends SharedLinkRepository{
    constructor() {
        super();
        this.mongo = new MongoBaseRepository(SharedLinkModel);
    }

    async findOneBy(filter) { return this.mongo.findOneBy(filter); }
    async findBy(filter) { return this.mongo.findBy(filter); }
    async findById(id) { return this.mongo.findById(id); }
    async create(data) { return this.mongo.create(data); }
    async save(entity) { return this.mongo.save(entity); }
    async softDelete(id) { return this.mongo.softDelete(id); }
    async updateByIdAtomic(id, updateData, options) { return this.mongo.updateByIdAtomic(id, updateData, options); }
    async updateOneAtomic(filter, updateData, options) { return this.mongo.updateOneAtomic(filter, updateData, options); }
    async upsertOneAtomic(filter, data, options) { return this.mongo.upsertOneAtomic(filter, data, options); }
}

export default MongoSharedLinkRepository;