import { noteService } from '../services/index.js';

class NoteController {
    // POST /api/notes
    async create(req, res, next) {
        try {
            const userId = req.user.id;
            const noteData = req.body;
            const note = await noteService.create(userId, noteData);
            return res.json(note);
        } catch (e) {
            next(e);
        }
    }

    // PUT /api/notes/:id
    async update(req, res, next) {
        try {
            const userId = req.user.id;
            const note = await noteService.update(req.params.id, userId, req.body);
            return res.json(note);
        } catch (e) {
            next(e);
        }
    }

    // DELETE /api/notes/:id
    async delete(req, res, next) {
        try {
            const userId = req.user.id;
            const deletedNote = await noteService.delete(req.params.id, userId);
            return res.json(deletedNote);
        } catch (e) {
            next(e);
        }
    }

    // PATCH /api/notes/:id/restore
    async restore(req, res, next) {
        try {
            const { id } = req.params;
            const userId = req.user.id;
            const note = await noteService.restore(id, userId);

            return res.json({
                success: true,
                message: 'Note successfully restored',
                note,
            });
        } catch (e) {
            next(e);
        }
    }

    // GET /api/notes/:id (optionalAuth — гости видят публичные заметки)
    async getById(req, res, next) {
        try {
            const userId = req.user?.id || null;
            const note = await noteService.getById(req.params.id, userId);
            return res.json(note);
        } catch (e) {
            next(e);
        }
    }

    // GET /api/notes
    async getUserNotes(req, res, next) {
        try {
            const userId = req.user.id;
            const notesList = await noteService.getUserNotes(userId);
            return res.json(notesList);
        } catch (e) {
            next(e);
        }
    }

    // GET /api/folders/:id/notes
    async getNotesInFolder(req, res, next) {
        try {
            const notes = await noteService.getNotesInFolder(req.params.id);
            return res.json(notes);
        } catch (e) {
            next(e);
        }
    }

    // GET /api/notes/public
    async getAllPublicNotes(req, res, next) {
        try {
            const userId = req.user?.id || null;
            const notes = await noteService.getAllPublicNotes(userId);
            return res.json(notes);
        } catch (e) {
            next(e);
        }
    }

    // GET /api/notes/shared
    async getSharedNotes(req, res, next) {
        try {
            const userId = req.user.id;
            const notes = await noteService.getSharedWithUser(userId);
            return res.json(notes);
        } catch (e) {
            next(e);
        }
    }

    // async getDeleted(req, res, next) {
    //     try {
    //         const userId = req.user.id;
    //         const notes = await noteService.getDeletedNotes(userId);
    //         return res.json(notes);
    //     } catch (e) {
    //         next(e);
    //     }
    // }

    // GET /api/search/notes?query
    async searchOwn(req, res, next) {
        try {
            const userId = req.user.id;
            const query = req.query.query || '';

            const notes = await noteService.searchOwnNotes(userId, query);
            return res.json({ success: true, notes });
        } catch (e) {
            next(e);
        }
    }

    // GET /api/search/notes/public?query
    async searchPublic(req, res, next) {
        try {
            const query = req.query.query || '';
            const userId = req.user?.id || null;
            const notes = await noteService.searchPublicNotes(query, userId);

            return res.json({ success: true, notes });
        } catch (e) {
            next(e);
        }
    }

    // GET /api/moderator/public-notes
    async getModeratorPublicNotes(req, res, next) {
        try {
            const notes = await noteService.getAllPublicNotesForModerator();
            return res.json(notes);
        } catch (e) {
            next(e);
        }
    }

    // DELETE /api/moderator/notes/:id
    async deleteNoteAsModerator(req, res, next) {
        try {
            const { id } = req.params;
            const deletedNote = await noteService.deleteNoteAsModerator(id);
            return res.json({
                success: true,
                message: 'Note deleted by moderator',
                note: deletedNote,
            });
        } catch (e) {
            next(e);
        }
    }

    // POST /api/moderator/notes/:id/block
    async blockNoteAsModerator(req, res, next) {
        try {
            const { id } = req.params;
            const blockedNote = await noteService.blockPublicNoteAsModerator(id);
            return res.json({
                success: true,
                message: 'Note blocked by moderator',
                note: blockedNote,
            });
        } catch (e) {
            next(e);
        }
    }
}

export default new NoteController();
