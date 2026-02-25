import { CommentModel } from '../../models/mongo/index.js';
import { CommentRepository } from '../base/index.js';
import MongoBaseRepository from './mongo-base-repository.js';

class MongoCommentRepository extends CommentRepository {
    constructor() {
        super();
        this.mongo = new MongoBaseRepository(CommentModel);
    }

    async findOneBy(filter) { return this.mongo.findOneBy(filter); }
    async findBy(filter) { return this.mongo.findBy(filter); }
    async findById(id) { return this.mongo.findById(id); }
    async create(data) { return this.mongo.create(data); }
    async save(entity) { return this.mongo.save(entity); }
    async updateByIdAtomic(id, updateData, options) { return this.mongo.updateByIdAtomic(id, updateData, options); }
    async updateOneAtomic(filter, updateData, options) { return this.mongo.updateOneAtomic(filter, updateData, options); }

    /**
     * Получение всех комментариев по noteId (с сортировкой по дате)
     */
    async getCommentsByNote(noteId) {
        return CommentModel.find({ noteId, isDeleted: false })
            .populate("authorId", "username email avatar")
            .populate("parentId")
            .sort({ createdAt: 1 })
            .lean();
    }

    /**
     * Получение всех ответов на конкретный комментарий
     */
    async getReplies(parentId) {
        return CommentModel.find({ parentId, isDeleted: false })
            .populate("authorId", "username email avatar")
            .sort({ createdAt: 1 })
            .lean();
    }

    /**
     * Мягкое удаление комментария
     */
    async softDelete(commentId) {
        const comment = await CommentModel.findById(commentId);
        if (!comment) return { status: 'notFound', message: 'Comment not found' };

        if (comment.isDeleted) {
            await CommentModel.deleteOne({ _id: commentId });
            return { status: 'permanentlyDeleted', message: 'Comment permanently deleted' };
        }

        comment.isDeleted = true;
        comment.content = '[deleted]';
        await comment.save();

        return { status: 'softDeleted', message: 'Comment marked as deleted' };
    }

    /**
     * Добавление/обновление реакции пользователя
     */
    async toggleReaction(commentId, userId, reactionType) {
        const comment = await CommentModel.findById(commentId);
        if (!comment) throw new Error("Comment not found");
        const existing = comment.reactions.find(r => String(r.userId) === String(userId));
        
        if (existing) {
            
            if (existing.type === reactionType) {
                // убираем реакцию, если повторно кликнули
                comment.reactions = comment.reactions.filter(r => String(r.userId) !== String(userId));
            } else {
                existing.type = reactionType;
            }
        } else {
            comment.reactions.push({ userId, type: reactionType });
        }

        await comment.save();
        return comment;
    }
}

export default MongoCommentRepository;