import mongoose from 'mongoose';
import { FileModel } from '../../models/mongo/index.js';
import { FileRepository } from '../base/index.js';
import MongoBaseRepository from './mongo-base-repository.js';

class MongoFileRepository extends FileRepository {
    constructor() {
        super();
        this.mongo = new MongoBaseRepository(FileModel);
        this.model = FileModel;
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

    async deleteById(id) {
        return this.mongo.deleteById(id);
    }

    async findByNoteId(noteId) {
        return FileModel.find({ noteId, isDeleted: false })
            .sort({ createdAt: -1 });
    }

    async getTotalSizeByUser(userId) {
        const result = await FileModel.aggregate([
            { $match: { uploadedBy: new mongoose.Types.ObjectId(userId), isDeleted: false } },
            { $group: { _id: null, total: { $sum: '$size' } } },
        ]);
        return result[0]?.total || 0;
    }
}

export default MongoFileRepository;
