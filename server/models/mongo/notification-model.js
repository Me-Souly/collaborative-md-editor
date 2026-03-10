import { Schema, model } from 'mongoose';

const NotificationSchema = new Schema({
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: {
        type: String,
        enum: ['note_shared', 'access_revoked'],
        required: true,
    },
    data: {
        noteId:     { type: Schema.Types.ObjectId, ref: 'Note' },
        noteTitle:  { type: String, default: '' },
        actorId:    { type: Schema.Types.ObjectId, ref: 'User' },
        actorLogin: { type: String, default: '' },
        permission: { type: String, default: '' }, // для note_shared
    },
    isRead: { type: Boolean, default: false, index: true },
}, { timestamps: true });

NotificationSchema.index({ userId: 1, createdAt: -1 });
NotificationSchema.index({ userId: 1, isRead: 1 });

export default model('Notification', NotificationSchema);
