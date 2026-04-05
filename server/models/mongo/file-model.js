import { Schema, model } from 'mongoose';

const FileSchema = new Schema({
    noteId: { type: Schema.Types.ObjectId, ref: 'Note', required: true, index: true },
    uploadedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },

    originalName: { type: String, required: true },
    storagePath: { type: String, required: true, unique: true },
    mimeType: { type: String, required: true },
    size: { type: Number, required: true },

    isImage: { type: Boolean, default: false },
    thumbnailPath: { type: String, default: null },

    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null },
}, { timestamps: true });

FileSchema.index({ noteId: 1, createdAt: -1 });
FileSchema.index({ uploadedBy: 1, createdAt: -1 });

export default model('File', FileSchema);
