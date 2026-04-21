import { folderRepository, noteRepository } from '../repositories/index.js';
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
        let path = '/';
        if (data.parentId) {
            const parent = await folderRepository.findById(data.parentId);
            if (!parent || parent.isDeleted) throw ApiError.NotFoundError('Parent folder not found');
            if (parent.ownerId.toString() !== userId.toString()) throw ApiError.ForbiddenError('Access denied');
            path = parent.path + parent._id.toString() + '/';
        }

        const folder = await folderRepository.create({
            ownerId: userId,
            title: data.title,
            parentId: data.parentId || null,
            path,
            color: data.color || '#FFFFFF',
            description: data.description || '',
        });
        return new FolderDTO(folder);
    }

    async updateFolder(userId, folderId, data) {
        const folder = await folderRepository.findOneBy({ _id: folderId, ownerId: userId, isDeleted: false });
        if (!folder) throw ApiError.NotFoundError('Folder not found');

        // If parentId is being changed, recompute path and update all descendants
        if ('parentId' in data && data.parentId !== folder.parentId?.toString()) {
            const oldPrefix = folder.path + folderId.toString() + '/';

            let newPath = '/';
            if (data.parentId) {
                const newParent = await folderRepository.findById(data.parentId);
                if (!newParent || newParent.isDeleted) throw ApiError.NotFoundError('New parent folder not found');
                if (newParent.ownerId.toString() !== userId.toString()) throw ApiError.ForbiddenError('Access denied');
                newPath = newParent.path + newParent._id.toString() + '/';
            }
            data.path = newPath;
            const newPrefix = newPath + folderId.toString() + '/';

            // Update paths for all descendant folders and notes
            await folderRepository.updatePathPrefix(userId, oldPrefix, newPrefix);
            await noteRepository.updatePathPrefix(userId, oldPrefix, newPrefix);
        }

        const updated = await folderRepository.updateOneAtomic(
            { _id: folderId, ownerId: userId, isDeleted: false },
            data
        );
        if (!updated) throw ApiError.NotFoundError('Folder not found');
        return new FolderDTO(updated);
    }

    async deleteFolder(userId, folderId) {
        const folder = await folderRepository.findOneBy({ _id: folderId, ownerId: userId, isDeleted: false });
        if (!folder) throw ApiError.NotFoundError('Folder not found');

        const prefix = folder.path + folderId.toString() + '/';
        const now = new Date();

        // Soft-delete the folder itself
        await folderRepository.updateByIdAtomic(folderId, { isDeleted: true, deletedAt: now });

        // Cascade soft-delete all descendant folders and notes in one query each
        await folderRepository.softDeleteByPathPrefix(userId, prefix);
        await noteRepository.softDeleteByPathPrefix(userId, prefix);

        // Also soft-delete notes directly in this folder (their path = '/.../folderId/')
        // They have path ending with folderId+'/' as their own path would be prefix itself
        // But notes stored in a folder have path = folder.path + folderId + '/'
        // which equals `prefix`, so the regex '^prefix' already catches them ✓

        return true;
    }

    // ── Корзина ───────────────────────────────────────────────────────────────

    async getDeletedFolders(userId) {
        const folders = await folderRepository.findBy({ ownerId: userId, isDeleted: true });
        return folders.map(f => new FolderDTO(f));
    }

    // ── Восстановление ────────────────────────────────────────────────────────

    async restoreFolder(userId, folderId) {
        const folder = await folderRepository.findOneBy({ _id: folderId, ownerId: userId, isDeleted: true });
        if (!folder) throw ApiError.NotFoundError('Folder not found');

        const prefix = folder.path + folderId.toString() + '/';

        await folderRepository.updateByIdAtomic(folderId, { isDeleted: false, deletedAt: null });

        // Cascade restore all descendant folders and notes
        await folderRepository.restoreByPathPrefix(userId, prefix);
        await noteRepository.restoreByPathPrefix(userId, prefix);

        return new FolderDTO({ ...folder.toObject(), isDeleted: false, deletedAt: null });
    }

    // ── Безвозвратное удаление ────────────────────────────────────────────────

    async permanentDeleteFolder(userId, folderId) {
        const folder = await folderRepository.findOneBy({ _id: folderId, ownerId: userId });
        if (!folder) throw ApiError.NotFoundError('Folder not found');

        const prefix = folder.path + folderId.toString() + '/';

        // Hard-delete all descendant folders and notes, then the folder itself
        await folderRepository.hardDeleteByPathPrefix(userId, prefix);
        await noteRepository.hardDeleteByPathPrefix(userId, prefix);
        await folderRepository.hardDelete(folderId.toString());

        return { status: 'deleted' };
    }
}

export default new FolderService();
