import ApiError from '../exceptions/api-error.js';
import { noteRepository, folderRepository, shareLinkRepository, userRepository } from '../repositories/index.js';
import NoteDto from '../dtos/note-dto.js';
import { NoteModel } from '../models/mongo/index.js';
import notificationService from './notification-service.js';

class NoteService {
    async getById(noteId, userId, role, shareToken = null) {
        const note = await noteRepository.findByIdWithTags(noteId);
        if (!note) throw ApiError.NotFoundError('Note not found');
        if (note.isDeleted) throw ApiError.NotFoundError('Note not found');

        // Проверка прав доступа
        const dto = new NoteDto(note, userId, role);
        if (dto.canRead) return dto;

        // Доступ по share-токену (для всех: гостей и авторизованных без доступа)
        if (shareToken) {
            const shareLink = await shareLinkRepository.findOneBy({ token: shareToken });
            if (!shareLink) throw ApiError.ForbiddenError('Access denied');
            if (shareLink.noteId.toString() !== note._id.toString()) throw ApiError.ForbiddenError('Access denied');
            if (shareLink.expiresAt && new Date(shareLink.expiresAt) < new Date()) {
                throw ApiError.BadRequest('Share link has expired');
            }
            dto.permission = shareLink.permission;
            dto.canRead = true;
            dto.canEdit = shareLink.permission === 'edit';
            return dto;
        }

        throw ApiError.ForbiddenError('Access denied');
    }

    async create(userId, noteData) {
        // Compute materialized path based on parentId
        let path = '/';
        if (noteData.parentId) {
            // parentId can point to a folder or another note
            const parentFolder = await folderRepository.findById(noteData.parentId);
            if (parentFolder && !parentFolder.isDeleted) {
                path = parentFolder.path + parentFolder._id.toString() + '/';
            } else {
                const parentNote = await noteRepository.findById(noteData.parentId);
                if (parentNote && !parentNote.isDeleted) {
                    path = parentNote.path + parentNote._id.toString() + '/';
                }
            }
        }

        const data = {
            ownerId: userId,
            ...noteData,
            path,
        };

        // Remove legacy folderId if somehow passed
        delete data.folderId;

        const created = await noteRepository.create(data);
        return new NoteDto(created, userId);
    }

    async update(noteId, userId, data) {
        const note = await noteRepository.findById(noteId);
        if (!note) throw ApiError.NotFoundError('Note not found');

        if (note.isDeleted) {
            throw ApiError.BadRequest('Cannot update deleted note');
        }

        if (note.ownerId && note.ownerId.toString() !== userId.toString()) {
            throw ApiError.Forbidden('Only the owner can update this note');
        }

        // If parentId is changing, recompute path
        if ('parentId' in data) {
            let path = '/';
            if (data.parentId) {
                const parentFolder = await folderRepository.findById(data.parentId);
                if (parentFolder && !parentFolder.isDeleted) {
                    path = parentFolder.path + parentFolder._id.toString() + '/';
                } else {
                    const parentNote = await noteRepository.findById(data.parentId);
                    if (parentNote && !parentNote.isDeleted) {
                        path = parentNote.path + parentNote._id.toString() + '/';
                    }
                }
            }
            data.path = path;

            // Update paths for all descendant notes
            const oldPrefix = note.path + noteId.toString() + '/';
            const newPrefix = path + noteId.toString() + '/';
            if (oldPrefix !== newPrefix) {
                await noteRepository.updatePathPrefix(userId, oldPrefix, newPrefix);
            }
        }

        // Remove legacy folderId if passed
        delete data.folderId;

        const updated = await noteRepository.updateByIdAtomic(noteId, data);
        if (!updated) throw ApiError.NotFoundError('Note not found');

        // Если заметка стала публичной — уведомить подписчиков
        if (data.isPublic === true && !note.isPublic) {
            this._notifyFollowers(note, userId).catch(() => {});
        }

        return new NoteDto(updated, userId);
    }

    async _notifyFollowers(note, ownerId) {
        const owner = await userRepository.findById(ownerId);
        if (!owner) return;
        const followers = await userRepository.findFollowers(ownerId);
        await Promise.all(
            followers.map((f) =>
                notificationService.create(f._id, 'note_published', {
                    noteId: note._id,
                    noteTitle: note.title || '',
                    actorId: ownerId,
                    actorLogin: owner.login || '',
                }),
            ),
        );
    }

    async togglePin(noteId, userId) {
        const note = await noteRepository.findById(noteId);
        if (!note) throw ApiError.NotFoundError('Note not found');
        if (note.isDeleted) throw ApiError.BadRequest('Cannot pin deleted note');
        if (note.ownerId.toString() !== userId.toString()) {
            throw ApiError.ForbiddenError('Only the owner can pin this note');
        }

        const updated = await noteRepository.updateByIdAtomic(noteId, { isPinned: !note.isPinned });
        return new NoteDto(updated, userId);
    }

    async softDelete(noteId, userId) {
        const note = await noteRepository.findById(noteId);
        if (!note) throw ApiError.NotFoundError('Note not found');

        if (note.isDeleted) {
            throw ApiError.BadRequest('Note is already deleted');
        }

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

        if (note.isDeleted) {
            throw ApiError.BadRequest('Note is already deleted');
        }

        if (note.ownerId && note.ownerId.toString() !== userId.toString()) {
            throw ApiError.Forbidden('Only the owner can delete this note');
        }

        const result = await noteRepository.delete(noteId);

        // Cascade soft-delete all descendant notes in one query
        const prefix = note.path + noteId.toString() + '/';
        await noteRepository.softDeleteByPathPrefix(userId, prefix);

        return result;
    }

    async restore(noteId, userId) {
        const note = await noteRepository.findById(noteId);
        if (!note) throw ApiError.NotFoundError('Note not found');

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

        // Cascade restore all descendant notes in one query
        const prefix = note.path + noteId.toString() + '/';
        await noteRepository.restoreByPathPrefix(userId, prefix);

        return new NoteDto(restoredNote, userId);
    }

    async getDeletedNotes(userId) {
        const notes = await noteRepository.findDeletedByUser(userId);
        return notes.map((note) => new NoteDto(note, userId));
    }

    async permanentDelete(noteId, userId) {
        const note = await noteRepository.findById(noteId);
        if (!note) throw ApiError.NotFoundError('Note not found');
        if (note.ownerId && note.ownerId.toString() !== userId.toString()) {
            throw ApiError.Forbidden('Only the owner can permanently delete this note');
        }

        // Hard-delete all descendant notes first
        const prefix = note.path + noteId.toString() + '/';
        await noteRepository.hardDeleteByPathPrefix(userId, prefix);

        await noteRepository.hardDelete(noteId);
        return { status: 'deleted', message: 'Note permanently deleted' };
    }

    async getUserNotes(userId) {
        const notes = await noteRepository.findByWithTags({
            ownerId: userId,
            isDeleted: false,
        });
        return notes.map((note) => new NoteDto(note, userId));
    }

    async getNotesInFolder(folderId, userId) {
        // Notes directly in this folder have path = '/.../folderId/'
        // We query by parentId (direct children only)
        const notes = await noteRepository.findBy({
            parentId: folderId,
            isDeleted: false,
        });

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
     */
    async saveYDocState(noteId, state, options = {}) {
        const { allowSnapshot = false } = options;

        try {
            console.log(
                `[NoteService] Сохранение YDocState для заметки ${noteId}, размер: ${state.length} байт`,
            );

            const buffer = Buffer.isBuffer(state) ? state : Buffer.from(state);

            const Y = await import('yjs');

            const SIZE_THRESHOLD = 500 * 1024; // 500 KB
            const shouldCreateSnapshot = buffer.length > SIZE_THRESHOLD && allowSnapshot;

            let finalState = buffer;
            let searchableContent = '';
            let snapshotCreated = false;

            try {
                const currentDoc = new Y.Doc();
                Y.applyUpdate(currentDoc, buffer);
                const text = currentDoc.getText('content');
                searchableContent = text.toString();

                if (searchableContent.length > 10000) {
                    searchableContent = searchableContent.substring(0, 10000);
                }

                if (buffer.length > SIZE_THRESHOLD && !allowSnapshot) {
                    console.log(
                        `[NoteService] ⏳ Размер ${(buffer.length / 1024).toFixed(2)} KB > порога, но документ активен - snapshot отложен`,
                    );
                }

                if (shouldCreateSnapshot) {
                    const originalSize = buffer.length;
                    console.log(
                        `[NoteService] ⚠ Размер состояния ${originalSize} байт превышает порог, создаем snapshot...`,
                    );

                    const snapshotDoc = new Y.Doc();
                    Y.applyUpdate(snapshotDoc, buffer);
                    finalState = Y.encodeStateAsUpdate(snapshotDoc);
                    snapshotDoc.destroy();
                    snapshotCreated = true;

                    const newSize = finalState.length;
                    const savings = originalSize - newSize;
                    const savingsPercent = ((savings / originalSize) * 100).toFixed(1);

                    console.log(
                        `[NoteService] Snapshot создан: было ${originalSize} байт, стало ${newSize} байт, экономия ${savingsPercent}%`,
                    );
                }
                currentDoc.destroy();
            } catch (extractError) {
                console.warn(
                    `[NoteService] Не удалось обработать ydocState:`,
                    extractError.message,
                );
            }

            const finalBuffer = Buffer.isBuffer(finalState) ? finalState : Buffer.from(finalState);

            const result = await NoteModel.findByIdAndUpdate(
                noteId,
                {
                    $set: {
                        ydocState: finalBuffer,
                        'meta.searchableContent': searchableContent,
                    },
                    $push: {
                        versions: {
                            $each: [{
                                ydocState: finalBuffer,
                                title:     null,
                                savedAt:   new Date(),
                            }],
                            $slice: -5,
                        },
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
                `[NoteService] YDocState сохранен для заметки ${noteId}, ${sizeInfo}, текст: ${searchableContent.length} символов`,
            );
        } catch (error) {
            console.error(`[NoteService] ✗ ОШИБКА при сохранении YDocState:`, error.message);
        }
    }

    async getAllPublicNotesForModerator() {
        const notes = await noteRepository.findBy({
            isPublic: true,
            isDeleted: false,
        });

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

        if (!note.isPublic) {
            throw ApiError.Forbidden('Moderator can only block public notes');
        }

        const updatedNote = await noteRepository.updateByIdAtomic(noteId, { isPublic: false });
        if (!updatedNote) {
            throw ApiError.NotFoundError('Note not found');
        }

        return new NoteDto(updatedNote, null);
    }
}

export default new NoteService();
