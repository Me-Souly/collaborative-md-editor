import { UserModel } from '../../models/mongo/index.js';
import { UserRepository } from '../base/index.js';
import MongoBaseRepository from './mongo-base-repository.js';

class MongoUserRepository extends UserRepository {
    constructor() {
        super();
        this.mongo = new MongoBaseRepository(UserModel);
    }

    async findOneBy(filter) {
        return this.mongo.findOneBy(filter);
    }
    async findBy(filter) {
        return this.mongo.findBy(filter);
    }
    async findById(id) {
        return this.mongo.findById(id);
    }
    async create(data) {
        return this.mongo.create(data);
    }
    async save(entity) {
        return this.mongo.save(entity);
    }
    async softDelete(id) {
        return this.mongo.softDelete(id);
    }
    async updateByIdAtomic(id, updateData, options) {
        return this.mongo.updateByIdAtomic(id, updateData, options);
    }
    async updateOneAtomic(filter, updateData, options) {
        return this.mongo.updateOneAtomic(filter, updateData, options);
    }
    async upsertOneAtomic(filter, data, options) {
        return this.mongo.upsertOneAtomic(filter, data, options);
    }

    async isFieldUnique(field, value, excludeUserId) {
        const filter = { [field]: value };
        if (excludeUserId) {
            filter._id = { $ne: excludeUserId };
        }
        const existing = await this.findOneBy(filter);
        return !existing;
    }

    async findByActivationLink(activationLink) {
        return UserModel.findOne({ activationLink });
    }

    async findAll() {
        return this.mongo.findAll();
    }

    async follow(myId, targetId) {
        return UserModel.findByIdAndUpdate(
            myId,
            { $addToSet: { following: targetId } },
            { new: true },
        );
    }

    async unfollow(myId, targetId) {
        return UserModel.findByIdAndUpdate(
            myId,
            { $pull: { following: targetId } },
            { new: true },
        );
    }

    async findFollowers(targetId) {
        return UserModel.find({ following: targetId, isDeleted: false }).select('_id login name');
    }
}

export default MongoUserRepository;
