import { FolderModel } from '../../models/mongo/index.js';
import { FolderRepository } from '../base/index.js';
import MongoBaseRepository from './mongo-base-repository.js';

const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

class MongoFolderRepository extends FolderRepository {
    constructor() {
        super();
        this.mongo = new MongoBaseRepository(FolderModel);
        this.model = FolderModel;
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

    async hardDelete(folderId) {
        return FolderModel.findByIdAndDelete(folderId);
    }

    /**
     * Find all descendants whose path starts with the given prefix.
     * prefix = parentFolder.path + parentFolder._id + '/'
     */
    async findByPathPrefix(ownerId, prefix) {
        return FolderModel.find({
            ownerId,
            path: { $regex: '^' + escapeRegex(prefix) },
        }).lean();
    }

    /**
     * Replace oldPrefix with newPrefix at the start of `path` for all matching folders.
     * Used when a folder is moved to update all descendants' paths.
     */
    async updatePathPrefix(ownerId, oldPrefix, newPrefix) {
        const suffix = oldPrefix.length;
        await FolderModel.updateMany(
            { ownerId, path: { $regex: '^' + escapeRegex(oldPrefix) } },
            [{ $set: { path: { $concat: [newPrefix, { $substrBytes: ['$path', suffix, -1] }] } } }],
        );
    }

    /**
     * Soft-delete all descendant folders under a given path prefix.
     */
    async softDeleteByPathPrefix(ownerId, prefix) {
        await FolderModel.updateMany(
            { ownerId, path: { $regex: '^' + escapeRegex(prefix) }, isDeleted: false },
            { $set: { isDeleted: true, deletedAt: new Date() } },
        );
    }

    /**
     * Restore all descendant folders under a given path prefix.
     */
    async restoreByPathPrefix(ownerId, prefix) {
        await FolderModel.updateMany(
            { ownerId, path: { $regex: '^' + escapeRegex(prefix) }, isDeleted: true },
            { $set: { isDeleted: false, deletedAt: null } },
        );
    }

    /**
     * Hard-delete all descendant folders under a given path prefix.
     */
    async hardDeleteByPathPrefix(ownerId, prefix) {
        await FolderModel.deleteMany({
            ownerId,
            path: { $regex: '^' + escapeRegex(prefix) },
        });
    }
}

export default MongoFolderRepository;
