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
        // Каскадно удаляем заметки в этой папке и подпапках
        await this._softDeleteFolderContents(folderId.toString());
        return true;
    }

    // ── Каскадное мягкое удаление ─────────────────────────────────────────────

    /** Рекурсивно мягко удаляет подпапки и заметки внутри folderId */
    async _softDeleteFolderContents(folderId) {
        // Заметки в этой папке
        await this._softDeleteNotesInFolder(folderId);

        // Подпапки
        const subfolders = await folderRepository.findBy({ parentId: folderId, isDeleted: false });
        for (const sub of subfolders) {
            await folderRepository.updateOneAtomic(
                { _id: sub._id, isDeleted: false },
                { isDeleted: true, deletedAt: new Date() }
            );
            await this._softDeleteFolderContents(sub._id.toString());
        }
    }

    async _softDeleteNotesInFolder(folderId) {
        const notes = await noteRepository.findBy({ folderId, isDeleted: false });
        for (const note of notes) {
            const noteId = note._id.toString();
            await noteRepository.updateByIdAtomic(noteId, { isDeleted: true, deletedAt: new Date() });
            await this._softDeleteSubnotesRecursive(noteId);
        }
    }

    async _softDeleteSubnotesRecursive(parentId) {
        const subnotes = await noteRepository.findBy({ parentId, isDeleted: false });
        for (const sub of subnotes) {
            const subId = sub._id.toString();
            await noteRepository.updateByIdAtomic(subId, { isDeleted: true, deletedAt: new Date() });
            await this._softDeleteSubnotesRecursive(subId);
        }
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

        await folderRepository.updateOneAtomic(
            { _id: folderId },
            { isDeleted: false, deletedAt: null }
        );
        await this._restoreFolderContents(folderId.toString());
        return new FolderDTO({ ...folder.toObject(), isDeleted: false, deletedAt: null });
    }

    async _restoreFolderContents(folderId) {
        await this._restoreNotesInFolder(folderId);

        const subfolders = await folderRepository.findBy({ parentId: folderId, isDeleted: true });
        for (const sub of subfolders) {
            await folderRepository.updateOneAtomic(
                { _id: sub._id },
                { isDeleted: false, deletedAt: null }
            );
            await this._restoreFolderContents(sub._id.toString());
        }
    }

    async _restoreNotesInFolder(folderId) {
        const notes = await noteRepository.findBy({ folderId, isDeleted: true });
        for (const note of notes) {
            const noteId = note._id.toString();
            await noteRepository.updateByIdAtomic(noteId, { isDeleted: false, deletedAt: null });
            await this._restoreSubnotesRecursive(noteId);
        }
    }

    async _restoreSubnotesRecursive(parentId) {
        const subnotes = await noteRepository.findBy({ parentId, isDeleted: true });
        for (const sub of subnotes) {
            const subId = sub._id.toString();
            await noteRepository.updateByIdAtomic(subId, { isDeleted: false, deletedAt: null });
            await this._restoreSubnotesRecursive(subId);
        }
    }

    // ── Безвозвратное удаление ────────────────────────────────────────────────

    async permanentDeleteFolder(userId, folderId) {
        const folder = await folderRepository.findOneBy({ _id: folderId, ownerId: userId });
        if (!folder) throw ApiError.NotFoundError('Folder not found');

        await this._hardDeleteFolderContents(folderId.toString());
        await folderRepository.hardDelete(folderId.toString());
        return { status: 'deleted' };
    }

    async _hardDeleteFolderContents(folderId) {
        const notes = await noteRepository.findBy({ folderId });
        for (const note of notes) {
            const noteId = note._id.toString();
            await this._hardDeleteSubnotesRecursive(noteId);
            await noteRepository.hardDelete(noteId);
        }

        const subfolders = await folderRepository.findBy({ parentId: folderId });
        for (const sub of subfolders) {
            await this._hardDeleteFolderContents(sub._id.toString());
            await folderRepository.hardDelete(sub._id.toString());
        }
    }

    async _hardDeleteSubnotesRecursive(parentId) {
        const subnotes = await noteRepository.findBy({ parentId });
        for (const sub of subnotes) {
            await this._hardDeleteSubnotesRecursive(sub._id.toString());
            await noteRepository.hardDelete(sub._id.toString());
        }
    }
}

export default new FolderService();
