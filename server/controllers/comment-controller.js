import { commentService } from '../services/index.js';

class CommentController {
    // POST /api/comments/:noteId
    async create(req, res, next) {
        try {
            const { noteId } = req.params;
            const { content, parentId } = req.body;
            const authorId = req.user.id;

            const comment = await commentService.create(noteId, authorId, content, parentId);
            res.status(201).json(comment);
        } catch (e) {
            next(e);
        }
    }

    // GET /api/comments/:noteId
    async getByNote(req, res, next) {
        try {
            const { noteId } = req.params;
            const comments = await commentService.getCommentsByNote(noteId);
            res.json(comments);
        } catch (e) {
            next(e);
        }
    }

    // DELETE /api/comments/:commentId
    async delete(req, res, next) {
        try {
            const { commentId } = req.params;
            const result = await commentService.delete(commentId);
            res.json(result);
        } catch (e) {
            next(e);
        }
    }

    // POST /api/comments/:commentId/react
    async react(req, res, next) {
        try {
            const { commentId } = req.params;
            const { type } = req.body;
            const userId = req.user._id;

            const updated = await commentService.toggleReaction(commentId, userId, type);
            res.json(updated);
        } catch (e) {
            next(e);
        }
    }
}

export default new CommentController();
