import { inlineCommentService } from '../services/index.js';

class InlineCommentController {
    // GET /api/notes/:noteId/inline-comments
    async getByNote(req, res, next) {
        try {
            const { noteId } = req.params;
            const comments = await inlineCommentService.getByNote(noteId, req.user.id);
            res.json(comments);
        } catch (e) {
            next(e);
        }
    }

    // POST /api/notes/:noteId/inline-comments
    async create(req, res, next) {
        try {
            const { noteId } = req.params;
            const { content, yjsAnchor, anchorText } = req.body;

            const comment = await inlineCommentService.create(noteId, req.user.id, {
                content,
                yjsAnchor,
                anchorText,
            });
            res.status(201).json(comment);
        } catch (e) {
            next(e);
        }
    }

    // PATCH /api/inline-comments/:commentId/resolve
    async resolve(req, res, next) {
        try {
            const { commentId } = req.params;
            const result = await inlineCommentService.resolve(commentId, req.user.id);
            res.json(result);
        } catch (e) {
            next(e);
        }
    }

    // DELETE /api/inline-comments/:commentId
    async delete(req, res, next) {
        try {
            const { commentId } = req.params;
            const result = await inlineCommentService.delete(commentId, req.user.id);
            res.json(result);
        } catch (e) {
            next(e);
        }
    }

    // POST /api/inline-comments/:commentId/react
    async react(req, res, next) {
        try {
            const { commentId } = req.params;
            const { reactionType } = req.body;
            const updated = await inlineCommentService.toggleReaction(commentId, req.user.id, reactionType);
            res.json(updated);
        } catch (e) {
            next(e);
        }
    }
}

export default new InlineCommentController();
