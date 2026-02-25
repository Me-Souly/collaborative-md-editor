import { noteAccessService, sharedLinkService } from '../services/index.js';

class NoteAccessController {
    // ========== Прямое управление доступом ==========
    
    // POST /api/notes/:id/access
    // Добавляет доступ пользователю к заметке
    async addAccess(req, res, next) {
        try {
            const { id } = req.params;
            const { userId, permission } = req.body;
            const grantedBy = req.user.id;

            console.log(userId, permission);

            if (!userId || !permission) {
                return res.status(400).json({ 
                    message: 'userId and permission are required' 
                });
            }

            const note = await noteAccessService.addAccess(id, userId, permission, grantedBy);
            return res.json(note);
        } catch (e) {
            next(e);
        }
    }

    // PATCH /api/notes/:id/access/:userId
    // Обновляет права доступа пользователя к заметке
    async updateAccess(req, res, next) {
        try {
            const { id, userId } = req.params;
            const { permission } = req.body;
            const grantedBy = req.user.id;

            if (!permission) {
                return res.status(400).json({ 
                    message: 'permission is required' 
                });
            }

            const note = await noteAccessService.updateAccess(id, userId, permission, grantedBy);
            return res.json(note);
        } catch (e) {
            next(e);
        }
    }
    
    // DELETE /api/notes/:id/access/:userId
    // Удаляет доступ пользователя к заметке
    async removeAccess(req, res, next) {
        try {
            const { id, userId } = req.params;
            const grantedBy = req.user.id;

            const note = await noteAccessService.removeAccess(id, userId, grantedBy);
            return res.json(note);
        } catch (e) {
            next(e);
        }
    }

    // GET /api/notes/:id/access
    // Получает список пользователей с доступом к заметке
    async getAccessList(req, res, next) {
        try {
            const { id } = req.params;
            const userId = req.user.id;

            const accessList = await noteAccessService.getAccessList(id, userId);
            return res.json(accessList);
        } catch (e) {
            next(e);
        }
    }

    // ========== Управление share-ссылками ==========

    // POST /api/notes/:id/share-link
    // Создаёт share-ссылку для заметки
    async createShareLink(req, res, next) {
        try {
            const { id } = req.params;
            const userId = req.user.id;
            const { permission = 'read', expiresAt = null } = req.body;

            const link = await sharedLinkService.createShareLink(id, userId, permission, expiresAt);
            return res.json(link);
        } catch (e) {
            next(e);
        }
    }

    // POST /api/share-link/connect
    // Подключает пользователя к заметке по share-ссылке
    async connectByShareLink(req, res, next) {
        try {
            const { token } = req.body;
            const userId = req.user.id;

            if (!token) {
                return res.status(400).json({ 
                    message: 'token is required' 
                });
            }

            const result = await sharedLinkService.connectByShareLink(token, userId);
            return res.json(result);
        } catch (e) {
            next(e);
        }
    }

    // GET /api/share-link/:token/info
    // Получает информацию о share-ссылке (публичный доступ)
    async getShareLinkInfo(req, res, next) {
        try {
            const { token } = req.params;
            const info = await sharedLinkService.getShareLinkInfo(token);
            return res.json(info);
        } catch (e) {
            next(e);
        }
    }

    // GET /api/notes/:id/share-links
    // Получает все share-ссылки для заметки
    async getShareLinks(req, res, next) {
        try {
            const { id } = req.params;
            const userId = req.user.id;

            const links = await sharedLinkService.getShareLinks(id, userId);
            return res.json(links);
        } catch (e) {
            next(e);
        }
    }

    // DELETE /api/share-link/:token
    // Удаляет share-ссылку
    async deleteShareLink(req, res, next) {
        try {
            const { token } = req.params;
            const userId = req.user.id;

            const result = await sharedLinkService.deleteShareLink(token, userId);
            return res.json(result);
        } catch (e) {
            next(e);
        }
    }
}

export default new NoteAccessController();