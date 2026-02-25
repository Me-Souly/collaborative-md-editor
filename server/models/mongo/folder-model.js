import { Schema, model } from 'mongoose';

const FolderSchema = new Schema({
  ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },

  title: { type: String, required: true, trim: true, maxlength: 100 },

  parentId: { type: Schema.Types.ObjectId, ref: 'Folder', default: null },

  description: { type: String, default: '', maxlength: 300 },
  color: { type: String, default: '#FFFFFF' },

  isShared: { type: Boolean, default: false },
  access: [{
    userId: { type: Schema.Types.ObjectId, ref: 'User' },
    permission: { type: String, enum: ['read', 'edit'], default: 'read' },
    grantedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    createdAt: { type: Date, default: Date.now }
  }],

  isDeleted: { type: Boolean, default: false },
  deletedAt: { type: Date, default: null }

}, { timestamps: true });

FolderSchema.index({ ownerId: 1, parentId: 1 });
FolderSchema.index({ name: 1, ownerId: 1 }, { unique: false });

export default model('Folder', FolderSchema);
