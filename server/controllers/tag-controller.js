import tagService from '../services/tag-service.js';

class TagController {
    // GET /api/tags
    async getAll(req, res, next) {
        try {
            const tags = await tagService.getAllTags();
            return res.json(tags);
        } catch (e) {
            next(e);
        }
    }

    // PATCH /api/notes/:id/tags
    async syncNoteTags(req, res, next) {
        try {
            const userId = req.user.id;
            const { id: noteId } = req.params;
            const { tags } = req.body; // string[]
            const result = await tagService.syncNoteTags(noteId, tags ?? [], userId);
            return res.json(result);
        } catch (e) {
            next(e);
        }
    }
}

export default new TagController();
