import { Schema, model } from 'mongoose';

const NotificationSchema = new Schema({
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: {
        type: String,
        enum: [
            'note_shared', 'access_revoked', 'note_published',
            'comment_added', 'inline_comment_added', 'comment_resolved'
        ],
        required: true,
    },
    // Полиморфный embedded object — shape зависит от type.
    // Старые документы просто не имеют новых полей (schema evolution без миграций).
    data: {
        noteId:         { type: Schema.Types.ObjectId, ref: 'Note' },
        noteTitle:      { type: String, default: '' },
        actorId:        { type: Schema.Types.ObjectId, ref: 'User' },
        actorLogin:     { type: String, default: '' },
        permission:     { type: String, default: '' },      // для note_shared
        commentId:      { type: Schema.Types.ObjectId },    // для comment_added / inline_comment_added
        commentPreview: { type: String, default: '' },      // первые 100 символов комментария
        reactionType:   { type: String, default: '' },      // для reaction_received (будущее)
    },
    isRead: { type: Boolean, default: false, index: true },
}, { timestamps: true });

NotificationSchema.index({ userId: 1, createdAt: -1 });
NotificationSchema.index({ userId: 1, isRead: 1 });

export default model('Notification', NotificationSchema);
