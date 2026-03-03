import { folderService } from '../services/index.js';

class FolderController {
    // GET /api/folders
    async getAll(req, res, next) {
        try {
            const folders = await folderService.getAllFolders(req.user.id);
            res.json(folders);
        } catch (e) {
            next(e);
        }
    }

    // GET /api/folders/:id
    async getById(req, res, next) {
        try {
            const folder = await folderService.getFolderById(req.user.id, req.params.id);
            res.json(folder);
        } catch (e) {
            next(e);
        }
    }

    // POST /api/folders
    async create(req, res, next) {
        try {
            const folder = await folderService.createFolder(req.user.id, req.body);
            res.json(folder);
        } catch (e) {
            next(e);
        }
    }

    // PUT /api/folders/:id
    async update(req, res, next) {
        try {
            const folder = await folderService.updateFolder(req.user.id, req.params.id, req.body);
            res.json(folder);
        } catch (e) {
            next(e);
        }
    }

    // DELETE /api/folders/:id
    async delete(req, res, next) {
        try {
            await folderService.deleteFolder(req.user.id, req.params.id);
            res.json({ success: true });
        } catch (e) {
            next(e);
        }
    }

    // GET /api/folders/trash
    async getDeleted(req, res, next) {
        try {
            const folders = await folderService.getDeletedFolders(req.user.id);
            res.json(folders);
        } catch (e) {
            next(e);
        }
    }

    // PATCH /api/folders/:id/restore
    async restore(req, res, next) {
        try {
            const folder = await folderService.restoreFolder(req.user.id, req.params.id);
            res.json(folder);
        } catch (e) {
            next(e);
        }
    }

    // DELETE /api/folders/:id/permanent
    async permanentDelete(req, res, next) {
        try {
            const result = await folderService.permanentDeleteFolder(req.user.id, req.params.id);
            res.json(result);
        } catch (e) {
            next(e);
        }
    }
}

export default new FolderController();
