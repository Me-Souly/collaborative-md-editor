import { noteRepository } from '../repositories/index.js';
import ApiError from '../exceptions/api-error.js';
import NoteDto from '../dtos/note-dto.js';

class NoteAccessService {
    /**
     * Добавляет или обновляет доступ пользователя к заметке
     * @param {string} noteId - ID заметки
     * @param {string} userId - ID пользователя, которому даётся доступ
     * @param {string} permission - Право доступа: 'read' или 'edit'
     * @param {string} grantedBy - ID пользователя, который даёт доступ (владелец)
     * @returns {Promise<Object>} Обновлённая заметка
     */
    async addAccess(noteId, userId, permission, grantedBy) {
        const note = await noteRepository.findById(noteId);
        if (!note) throw ApiError.NotFoundError('Note not found');

        if (note.ownerId.toString() !== grantedBy.toString()) {
            throw ApiError.ForbiddenError('Only owner can modify access');
        }

        if (!['read', 'edit'].includes(permission)) {
            throw ApiError.BadRequest('Invalid permission. Must be "read" or "edit"');
        }

        const accessEntry = {
            userId,
            permission,
            grantedBy,
            createdAt: new Date()
        };

        // Используем атомарные операторы MongoDB
        // Сначала пытаемся обновить существующий элемент
        const updatedNote = await noteRepository.model.findOneAndUpdate(
            {
                _id: noteId,
                'access.userId': userId
            },
            {
                $set: { 'access.$': accessEntry }
            },
            { new: true }
        );

        // Если не обновилось (элемента нет), добавляем новый
        if (!updatedNote) {
            await noteRepository.model.findByIdAndUpdate(
                noteId,
                {
                    $push: { access: accessEntry }
                },
                { new: true }
            );
        }

        const noteData = await noteRepository.findById(noteId);
        return new NoteDto(noteData, grantedBy);
    }

    /**
     * Обновляет права доступа пользователя к заметке
     * @param {string} noteId - ID заметки
     * @param {string} userId - ID пользователя
     * @param {string} permission - Новое право доступа: 'read' или 'edit'
     * @param {string} grantedBy - ID пользователя, который обновляет доступ (владелец)
     * @returns {Promise<Object>} Обновлённая заметка
     */
    async updateAccess(noteId, userId, permission, grantedBy) {
        return this.addAccess(noteId, userId, permission, grantedBy);
    }

    /**
     * Удаляет доступ пользователя к заметке
     * @param {string} noteId - ID заметки
     * @param {string} userId - ID пользователя, у которого удаляется доступ
     * @param {string} grantedBy - ID пользователя, который удаляет доступ (владелец)
     * @returns {Promise<Object>} Обновлённая заметка
     */
    async removeAccess(noteId, userId, grantedBy) {
        const note = await noteRepository.findById(noteId);
        if (!note) throw ApiError.NotFoundError('Note not found');

        if (note.ownerId.toString() !== grantedBy.toString()) {
            throw ApiError.ForbiddenError('Only owner can modify access');
        }

        // Используем атомарный оператор $pull
        await noteRepository.model.findByIdAndUpdate(
            noteId,
            {
                $pull: { access: { userId: userId } }
            },
            { new: true }
        );

        const noteData = await noteRepository.findById(noteId);
        return new NoteDto(noteData, grantedBy);
    }

    /**
     * Получает список пользователей с доступом к заметке
     * @param {string} noteId - ID заметки
     * @param {string} userId - ID пользователя, запрашивающего список (для проверки прав)
     * @returns {Promise<Array>} Массив объектов доступа
     */
    async getAccessList(noteId, userId) {
        const note = await noteRepository.findById(noteId);
        if (!note) throw ApiError.NotFoundError('Note not found');

        // Только владелец может видеть список доступа
        if (note.ownerId.toString() !== userId.toString()) {
            throw ApiError.ForbiddenError('Only owner can view access list');
        }

        return note.access || [];
    }

    /**
     * Определяет уровень доступа пользователя к заметке.
     * Этот метод предназначен для быстрого получения прав доступа 
     * для WebSocket-сервера.
     * @param {string} userId - ID пользователя
     * @param {string} noteId - ID заметки
     * @returns {Promise<'edit' | 'read' | null>} Уровень доступа ('edit', 'read') или null, если доступ запрещен.
     */
    async getUserPermissionForNote(userId, noteId) {
        // Мы используем репозиторий, но запрашиваем только необходимые поля
        const note = await noteRepository.findById(noteId, 'ownerId isPublic access isDeleted');

        if (!note || note.isDeleted) {
            return null; // Заметка не найдена или удалена
        }

        const noteOwnerId = note.ownerId.toString();
        const requestingUserId = userId.toString();

        // 1. Проверка на Владельца (высший приоритет)
        if (noteOwnerId === requestingUserId) {
            return 'edit';
        }

        // 2. Проверка по списку явного доступа
        const userAccess = note.access.find(
            a => a.userId.toString() === requestingUserId
        );
        if (userAccess) {
            // Возвращаем явное разрешение ('edit' или 'read')
            return userAccess.permission; 
        }

        // 3. Проверка на публичный доступ
        if (note.isPublic) {
            return 'read'; // Публичные заметки доступны для чтения
        }

        // 4. Доступа нет
        return null;
    }
}

export default new NoteAccessService();

