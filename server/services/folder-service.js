import { folderRepository } from '../repositories/index.js';
import FolderDTO from '../dtos/folder-dto.js';
import ApiError from '../exceptions/api-error.js';

class FolderService {
    async getAllFolders(userId) {
        const folders = await folderRepository.findBy({ ownerId: userId, isDeleted: false });
        return folders.map(f => new FolderDTO(f));
    }

    async getFolderById(userId, folderId) {
        const folder = await folderRepository.findOneBy({ _id: folderId, ownerId: userId, isDeleted: false });
        if (!folder) throw ApiError.NotFoundError('Folder not found');
        return new FolderDTO(folder);
    }

    async createFolder(userId, data) {
        const folder = await folderRepository.create({
            ownerId: userId,
            title: data.title,
            parentId: data.parentId || null,
            color: data.color || '#FFFFFF',
            description: data.description || ''
        });
        return new FolderDTO(folder);
    }

    async updateFolder(userId, folderId, data) {
        const folder = await folderRepository.updateOneAtomic(
            { _id: folderId, ownerId: userId, isDeleted: false },
            data
        );
        if (!folder) throw ApiError.NotFoundError('Folder not found');
        return new FolderDTO(folder);
    }

    async deleteFolder(userId, folderId) {
        const folder = await folderRepository.updateOneAtomic(
            { _id: folderId, ownerId: userId, isDeleted: false },
            { isDeleted: true, deletedAt: new Date() }
        );
        if (!folder) throw ApiError.NotFoundError('Folder not found');
        return true;
    }
}

export default new FolderService();