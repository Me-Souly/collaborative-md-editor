import ApiError from '../exceptions/api-error.js';
import { noteRepository } from '../repositories/index.js';
import NoteDto from '../dtos/note-dto.js';
import { NoteModel } from '../models/mongo/index.js';
import { userRepository } from '../repositories/index.js';

class NoteService {
    async getById(noteId, userId) {
        const note = await noteRepository.findById(noteId);
        if (!note) throw ApiError.NotFoundError('Note not found');

        // Проверка прав доступа
        const dto = new NoteDto(note, userId);
        if (!dto.canRead) {
            throw ApiError.ForbiddenError('Access denied');
        }

        return dto;
    }

    async create(userId, noteData) {
        const data = {
            ownerId: userId,
            ...noteData,
        };

        const created = await noteRepository.create(data);
        return new NoteDto(created, userId);
    }

    async update(noteId, userId, data) {
        const note = await noteRepository.findById(noteId);
        if (!note) throw ApiError.NotFoundError('Note not found');

        // Проверяем, что заметка не удалена
        if (note.isDeleted) {
            throw ApiError.BadRequest('Cannot update deleted note');
        }

        // Проверяем, что пользователь является владельцем заметки
        if (note.ownerId && note.ownerId.toString() !== userId.toString()) {
            throw ApiError.Forbidden('Only the owner can update this note');
        }

        const updated = await noteRepository.updateByIdAtomic(noteId, data);
        if (!updated) throw ApiError.NotFoundError('Note not found');
        return new NoteDto(updated, userId);
    }

    async softDelete(noteId, userId) {
        const note = await noteRepository.findById(noteId);
        if (!note) throw ApiError.NotFoundError('Note not found');

        // Проверяем, что заметка не удалена
        if (note.isDeleted) {
            throw ApiError.BadRequest('Note is already deleted');
        }

        // Проверяем, что пользователь является владельцем заметки
        if (note.ownerId && note.ownerId.toString() !== userId.toString()) {
            throw ApiError.Forbidden('Only the owner can delete this note');
        }

        const deletedNote = await noteRepository.softDelete(noteId);
        if (!deletedNote) throw ApiError.NotFoundError('Note not found');
        return new NoteDto(deletedNote, userId);
    }

    async delete(noteId, userId) {
        const note = await noteRepository.findById(noteId);
        if (!note) throw ApiError.NotFoundError('Note not found');

        // Проверяем, что заметка не удалена (для hard delete можно разрешить удаление уже soft-deleted заметок)
        // Но для безопасности лучше проверять
        if (note.isDeleted) {
            throw ApiError.BadRequest('Note is already deleted');
        }

        // Проверяем, что пользователь является владельцем заметки
        if (note.ownerId && note.ownerId.toString() !== userId.toString()) {
            throw ApiError.Forbidden('Only the owner can delete this note');
        }

        return await noteRepository.delete(noteId);
    }

    async restore(noteId, userId) {
        const note = await noteRepository.findById(noteId);
        if (!note) throw ApiError.NotFoundError('Note not found');

        // Проверяем, что пользователь является владельцем заметки
        if (note.ownerId && note.ownerId.toString() !== userId.toString()) {
            throw ApiError.Forbidden('Only the owner can restore this note');
        }

        if (!note.isDeleted) {
            throw ApiError.BadRequest('Note is not marked as deleted');
        }

        const restoredNote = await noteRepository.updateByIdAtomic(noteId, {
            isDeleted: false,
            deletedAt: null,
        });

        return new NoteDto(restoredNote, userId);
    }

    async getDeletedNotes(userId) {
        const notes = await noteRepository.findDeletedByUser(userId);
        return notes.map((note) => new NoteDto(note, userId));
    }

    async getUserNotes(userId) {
        const notes = await noteRepository.findBy({
            ownerId: userId,
            isDeleted: false,
        });
        return notes.map((note) => new NoteDto(note, userId));
    }

    async getNotesInFolder(folderId, userId) {
        const notes = await noteRepository.findBy({
            folderId,
            isDeleted: false,
        });

        // Фильтруем заметки по правам доступа
        const accessibleNotes = notes.filter((note) => {
            const dto = new NoteDto(note, userId);
            return dto.canRead;
        });

        return accessibleNotes.map((note) => new NoteDto(note, userId));
    }

    async getAllPublicNotes(userId = null) {
        const notes = await noteRepository.findPublicWithOwner();
        return notes.map((note) => new NoteDto(note, userId));
    }

    async getSharedWithUser(userId) {
        const notes = await noteRepository.findSharedWithUser({ userId });
        return notes.map((note) => new NoteDto(note, userId));
    }

    async searchOwnNotes(userId, query) {
        const notes = await noteRepository.searchOwnNotes(userId, query);
        return notes.map((note) => new NoteDto(note, userId));
    }

    async searchPublicNotes(query, userId = null) {
        const notes = await noteRepository.searchPublicNotes(query);
        return notes.map((note) => new NoteDto(note, userId));
    }

    async getNoteById(noteId) {
        const note = await noteRepository.findById(noteId);
        return note;
    }

    /**
     * Сохраняет состояние Yjs документа в БД
     * @param {string} noteId - ID заметки
     * @param {Buffer|Uint8Array} state - Закодированное состояние Yjs документа
     * @param {Object} options - Опции сохранения
     * @param {boolean} options.allowSnapshot - Разрешено ли создавать snapshot (только когда документ "тихий")
     */
    async saveYDocState(noteId, state, options = {}) {
        const { allowSnapshot = false } = options;

        try {
            console.log(
                `[NoteService] Сохранение YDocState для заметки ${noteId}, размер: ${state.length} байт`,
            );

            // Убеждаемся, что это Buffer
            const buffer = Buffer.isBuffer(state) ? state : Buffer.from(state);

            const Y = await import('yjs');

            // Проверяем размер состояния
            const SIZE_THRESHOLD = 500 * 1024; // 500 KB - порог для создания snapshot
            // Создаём snapshot только если документ "тихий" (allowSnapshot = true)
            const shouldCreateSnapshot = buffer.length > SIZE_THRESHOLD && allowSnapshot;

            let finalState = buffer;
            let searchableContent = '';
            let snapshotCreated = false;

            try {
                // Декодируем текущее состояние
                const currentDoc = new Y.Doc();
                Y.applyUpdate(currentDoc, buffer);
                const text = currentDoc.getText('content');
                searchableContent = text.toString();

                // Ограничиваем длину для индекса (MongoDB text index имеет ограничения)
                if (searchableContent.length > 10000) {
                    searchableContent = searchableContent.substring(0, 10000);
                }

                // Если размер превышает порог И документ "тихий", создаем snapshot
                if (buffer.length > SIZE_THRESHOLD && !allowSnapshot) {
                    console.log(
                        `[NoteService] ⏳ Размер ${(buffer.length / 1024).toFixed(2)} KB > порога, но документ активен - snapshot отложен`,
                    );
                }

                if (shouldCreateSnapshot) {
                    const originalSize = buffer.length;
                    console.log(
                        `[NoteService] ⚠ Размер состояния ${originalSize} байт (${(originalSize / 1024).toFixed(2)} KB) превышает порог ${SIZE_THRESHOLD} байт, документ тихий - создаем snapshot...`,
                    );

                    // ВАЖНО: Компактим через re-apply, а НЕ через text.insert().
                    // text.insert() создаёт новые CRDT ID, что ломает мерж
                    // при реконнекте клиента с IndexedDB кэшем (дупликация контента).
                    // Re-apply на свежий doc сохраняет оригинальные ID,
                    // но GC удаляет tombstone'ы удалённых элементов.
                    const snapshotDoc = new Y.Doc();
                    Y.applyUpdate(snapshotDoc, buffer);

                    // Кодируем snapshot — GC уже применён, tombstone'ы удалены
                    finalState = Y.encodeStateAsUpdate(snapshotDoc);
                    snapshotDoc.destroy();
                    snapshotCreated = true;

                    const newSize = finalState.length;
                    const savings = originalSize - newSize;
                    const savingsPercent = ((savings / originalSize) * 100).toFixed(1);

                    console.log(
                        `[NoteService] ✓ Snapshot создан: было ${originalSize} байт (${(originalSize / 1024).toFixed(2)} KB), стало ${newSize} байт (${(newSize / 1024).toFixed(2)} KB)`,
                    );
                    console.log(
                        `[NoteService] ✓ Экономия: ${savings} байт (${(savings / 1024).toFixed(2)} KB, ${savingsPercent}%)`,
                    );
                }
                currentDoc.destroy();
            } catch (extractError) {
                console.warn(
                    `[NoteService] Не удалось обработать ydocState:`,
                    extractError.message,
                );
                // Продолжаем с исходным состоянием
            }

            // Убеждаемся, что finalState - это Buffer
            const finalBuffer = Buffer.isBuffer(finalState) ? finalState : Buffer.from(finalState);

            // Используем прямой вызов модели для гарантии сохранения Buffer и searchableContent
            const result = await NoteModel.findByIdAndUpdate(
                noteId,
                {
                    $set: {
                        ydocState: finalBuffer,
                        'meta.searchableContent': searchableContent,
                    },
                },
                { new: true },
            );

            if (!result) {
                console.error(`[NoteService] ✗ Заметка ${noteId} не найдена при сохранении`);
                return;
            }

            const sizeInfo = snapshotCreated
                ? `snapshot: ${finalBuffer.length} байт (${(finalBuffer.length / 1024).toFixed(2)} KB)`
                : `${finalBuffer.length} байт (${(finalBuffer.length / 1024).toFixed(2)} KB)`;
            console.log(
                `[NoteService] ✓ YDocState сохранен в БД для заметки ${noteId}, ${sizeInfo}, текст: ${searchableContent.length} символов`,
            );
        } catch (error) {
            console.error(`[NoteService] ✗ ОШИБКА при сохранении YDocState:`, error.message);
            // НЕ выбрасываем ошибку, чтобы не прерывать работу YJS
        }
    }

    async getAllPublicNotesForModerator() {
        const notes = await noteRepository.findBy({
            isPublic: true,
            isDeleted: false,
        });

        // Получаем информацию об авторах
        const notesWithAuthors = await Promise.all(
            notes.map(async (note) => {
                const owner = await userRepository.findById(note.ownerId);
                return {
                    id: note._id.toString(),
                    title: note.title,
                    ownerId: note.ownerId.toString(),
                    author: owner
                        ? {
                              id: owner._id.toString(),
                              name: owner.name || owner.login,
                              login: owner.login,
                              email: owner.email,
                          }
                        : null,
                    contentPreview:
                        note.meta?.excerpt || note.meta?.searchableContent?.slice(0, 100) || '',
                    createdAt: note.createdAt,
                    updatedAt: note.updatedAt,
                    isPublic: note.isPublic,
                };
            }),
        );

        return notesWithAuthors;
    }

    async deleteNoteAsModerator(noteId) {
        const note = await noteRepository.findById(noteId);
        if (!note) {
            throw ApiError.NotFoundError('Note not found');
        }

        // Модератор может удалять любые публичные заметки
        if (!note.isPublic) {
            throw ApiError.Forbidden('Moderator can only delete public notes');
        }

        const deletedNote = await noteRepository.softDelete(noteId);
        if (!deletedNote) {
            throw ApiError.NotFoundError('Note not found');
        }

        return new NoteDto(deletedNote, null);
    }

    async blockPublicNoteAsModerator(noteId) {
        const note = await noteRepository.findById(noteId);
        if (!note) {
            throw ApiError.NotFoundError('Note not found');
        }

        // Модератор может блокировать только публичные заметки
        if (!note.isPublic) {
            throw ApiError.Forbidden('Moderator can only block public notes');
        }

        // Блокируем заметку, делая её приватной
        const updatedNote = await noteRepository.updateByIdAtomic(noteId, { isPublic: false });
        if (!updatedNote) {
            throw ApiError.NotFoundError('Note not found');
        }

        return new NoteDto(updatedNote, null);
    }
}

export default new NoteService();
