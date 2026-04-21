import { Schema, model } from 'mongoose';

const FolderSchema = new Schema({
  ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },

  title: { type: String, required: true, trim: true, maxlength: 100 },

  parentId: { type: Schema.Types.ObjectId, ref: 'Folder', default: null },

  // Materialized path: '/' for root, '/parentId/' for child, '/grandparentId/parentId/' for grandchild
  path: { type: String, default: '/' },

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

FolderSchema.index({ ownerId: 1, path: 1 });
FolderSchema.index({ ownerId: 1, updatedAt: -1 });

export default model('Folder', FolderSchema);
