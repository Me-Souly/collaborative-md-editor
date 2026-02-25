import { noteRepository, shareLinkRepository } from '../repositories/index.js';
import ApiError from '../exceptions/api-error.js';
import { v4 as uuidv4 } from 'uuid';

class SharedLinkService {
    /**
     * Создаёт share-ссылку для заметки
     * @param {string} noteId - ID заметки
     * @param {string} userId - ID владельца заметки
     * @param {string} permission - Право доступа по ссылке: 'read' или 'edit' (по умолчанию 'read')
     * @param {Date|null} expiresAt - Дата истечения ссылки (null = бессрочно)
     * @returns {Promise<Object>} Объект с токеном и ссылкой
     */
    async createShareLink(noteId, userId, permission = 'read', expiresAt = null) {
        const note = await noteRepository.findById(noteId);
        if (!note) throw ApiError.NotFoundError('Note not found');

        if (note.ownerId.toString() !== userId.toString()) {
            throw ApiError.ForbiddenError('Only owner can create share link');
        }

        if (!['read', 'edit'].includes(permission)) {
            throw ApiError.BadRequest('Invalid permission. Must be "read" or "edit"');
        }

        // Генерируем уникальный токен
        const token = uuidv4();

        // Сохраняем ссылку в базу
        const shareLink = await shareLinkRepository.create({
            noteId,
            token,
            permission,
            expiresAt,
            createdAt: new Date()
        });

        // Возвращаем ссылку для клиента
        return {
            token,
            shareLink: `${process.env.CLIENT_URL}/share/${token}`,
            permission,
            expiresAt,
            createdAt: shareLink.createdAt
        };
    }

    /**
     * Подключает пользователя к заметке по share-ссылке
     * @param {string} token - Токен из share-ссылки
     * @param {string} userId - ID пользователя, который подключается
     * @returns {Promise<Object>} Объект с информацией о заметке и доступе
     */
    async connectByShareLink(token, userId) {
        // Находим ссылку по токену
        const shareLink = await shareLinkRepository.findOneBy({ token });
        if (!shareLink) {
            throw ApiError.NotFoundError('Share link not found or invalid');
        }

        // Проверяем срок действия ссылки
        if (shareLink.expiresAt && new Date(shareLink.expiresAt) < new Date()) {
            throw ApiError.BadRequest('Share link has expired');
        }

        // Получаем заметку
        const note = await noteRepository.findById(shareLink.noteId);
        if (!note) {
            throw ApiError.NotFoundError('Note not found');
        }

        // Проверяем, не удалена ли заметка
        if (note.isDeleted) {
            throw ApiError.NotFoundError('Note has been deleted');
        }

        // Проверяем, нет ли уже доступа у этого пользователя
        const existingAccess = note.access.find(
            a => a.userId.toString() === userId.toString()
        );

        if (existingAccess) {
            // Если доступ уже есть, обновляем права доступа на максимальные из существующих
            const newPermission = 
                existingAccess.permission === 'edit' || shareLink.permission === 'edit' 
                    ? 'edit' 
                    : 'read';
            
            if (existingAccess.permission !== newPermission) {
                existingAccess.permission = newPermission;
                await noteRepository.updateByIdAtomic(shareLink.noteId, { access: note.access });
            }
        } else {
            // Добавляем новый доступ
            note.access.push({
                userId,
                permission: shareLink.permission,
                grantedBy: note.ownerId,
                createdAt: new Date()
            });
            await noteRepository.updateByIdAtomic(shareLink.noteId, { access: note.access });
        }

        return {
            noteId: note._id,
            title: note.title,
            permission: shareLink.permission,
            message: 'Access granted successfully'
        };
    }

    /**
     * Получает информацию о share-ссылке (без подключения)
     * @param {string} token - Токен из share-ссылки
     * @returns {Promise<Object>} Информация о ссылке и заметке
     */
    async getShareLinkInfo(token) {
        const shareLink = await shareLinkRepository.findOneBy({ token });
        if (!shareLink) {
            throw ApiError.NotFoundError('Share link not found');
        }

        if (shareLink.expiresAt && new Date(shareLink.expiresAt) < new Date()) {
            throw ApiError.BadRequest('Share link has expired');
        }

        const note = await noteRepository.findById(shareLink.noteId);
        if (!note || note.isDeleted) {
            throw ApiError.NotFoundError('Note not found');
        }

        return {
            noteId: note._id,
            title: note.title,
            permission: shareLink.permission,
            expiresAt: shareLink.expiresAt
        };
    }

    /**
     * Удаляет share-ссылку
     * @param {string} token - Токен ссылки
     * @param {string} userId - ID владельца заметки
     * @returns {Promise<Object>} Результат удаления
     */
    async deleteShareLink(token, userId) {
        const shareLink = await shareLinkRepository.findOneBy({ token });
        if (!shareLink) {
            throw ApiError.NotFoundError('Share link not found');
        }

        const note = await noteRepository.findById(shareLink.noteId);
        if (!note) {
            throw ApiError.NotFoundError('Note not found');
        }

        if (note.ownerId.toString() !== userId.toString()) {
            throw ApiError.ForbiddenError('Only owner can delete share link');
        }

        await shareLinkRepository.deleteOne({ token });
        return { success: true, message: 'Share link deleted' };
    }

    /**
     * Получает все share-ссылки для заметки
     * @param {string} noteId - ID заметки
     * @param {string} userId - ID владельца заметки
     * @returns {Promise<Array>} Массив share-ссылок
     */
    async getShareLinks(noteId, userId) {
        const note = await noteRepository.findById(noteId);
        if (!note) throw ApiError.NotFoundError('Note not found');

        if (note.ownerId.toString() !== userId.toString()) {
            throw ApiError.ForbiddenError('Only owner can view share links');
        }

        const shareLinks = await shareLinkRepository.findBy({ noteId });
        return shareLinks.map(link => ({
            token: link.token,
            shareLink: `${process.env.CLIENT_URL}/share/${link.token}`,
            permission: link.permission,
            expiresAt: link.expiresAt,
            createdAt: link.createdAt
        }));
    }
}

export default new SharedLinkService();
