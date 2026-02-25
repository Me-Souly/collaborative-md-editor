import { TokenModel } from '../../models/mongo/index.js';
import { TokenRepository } from '../base/index.js';
import MongoBaseRepository from './mongo-base-repository.js';

class MongoTokenRepository extends TokenRepository {
    constructor() {
        super();
        this.mongo = new MongoBaseRepository(TokenModel);
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

    async findRefreshToken(refreshToken) {
        return TokenModel.findOne({
            token: refreshToken,
            type: 'refresh'
        });
    }

    async findResetToken(resetToken) { 
        return TokenModel.findOne({
            token: resetToken,
            type: 'reset'
        });    
    }

    async findActivationToken(activationToken) { 
        return TokenModel.findOne({
            token: activationToken,
            type: 'activation'
        });    
    }

    async deleteToken(token) {
        return TokenModel.deleteOne({token});
    }

    async removeTokensByUserId(userId) {
        return TokenModel.deleteMany({userId});
    }

    async deleteExpiredTokens() { 
        const now = new Date();
        const result = await TokenModel.deleteMany({ expiresAt: { $lt: now } });
        return result.deletedCount;
    }

    async saveTokenAtomic(userId, token, type, expiresAt) {
        const now = new Date();

        const tokenData = await TokenModel.findOneAndUpdate(
            { userId, type },                     // фильтр
            { token, createdAt: now, expiresAt }, // обновление
            { upsert: true, new: true }           // если нет — создаст, вернёт новый
        );

        return tokenData;
    }
}

export default MongoTokenRepository;
