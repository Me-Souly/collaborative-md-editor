import mongoose from 'mongoose';

const SharedLinkSchema = new mongoose.Schema({
  noteId: { type: mongoose.Schema.Types.ObjectId, ref: 'Note', required: true },
  token: { type: String, required: true, unique: true },
  permission: { type: String, enum: ['read', 'edit'], default: 'read' },
  expiresAt: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model('SharedLink', SharedLinkSchema);
