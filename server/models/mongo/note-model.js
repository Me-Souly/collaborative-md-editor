import { Schema, model } from 'mongoose';

const NoteSchema = new Schema({
  ownerId: { type: Schema.Types.ObjectId, ref: 'User', index: true, required: true },
  title: { type: String, default: '' },

  ydocState: { type: Buffer, default: null },

  // parentId points to either a Folder or another Note (replaces separate folderId)
  parentId: { type: Schema.Types.ObjectId, default: null },

  // Materialized path: '/' for root, '/parentId/' for child, '/gp/parentId/' for grandchild
  path: { type: String, default: '/' },

  // Tags с провенансом: кто и когда добавил тег (schema evolution без миграций)
  tags: [{
    tagId:   { type: Schema.Types.ObjectId, ref: 'Tag', required: true },
    addedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    addedAt: { type: Date, default: Date.now }
  }],

  isPinned: { type: Boolean, default: false },
  isPublic: { type: Boolean, default: false },
  allowCopy: { type: Boolean, default: true },
  access: [{
    userId: { type: Schema.Types.ObjectId, ref: 'User' },
    permission: { type: String, enum: ['read','edit'], default: 'read' },
    grantedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    createdAt: { type: Date, default: Date.now }
  }],

  maxEditors: { type: Number, default: 10 },

  version: { type: Number, default: 1 },

  meta: {
    views: { type: Number, default: 0 },
    lastViewedAt: { type: Date, default: null },
    excerpt: { type: String, default: '' },
    // Поле для полнотекстового поиска (извлекается из ydocState)
    searchableContent: { type: String, default: '' }
  },

  isDeleted: { type: Boolean, default: false },
  deletedAt: { type: Date, default: null },

  // История версий — последние 5, хранятся прямо в документе
  versions: [{
    ydocState: { type: Buffer },
    title:     { type: String, default: '' },
    savedBy:   { type: Schema.Types.ObjectId, ref: 'User', default: null },
    savedAt:   { type: Date, default: Date.now }
  }]

}, { timestamps: true });

// Индексы
NoteSchema.index({ ownerId: 1, updatedAt: -1 });
NoteSchema.index({ isPublic: 1, updatedAt: -1 });
NoteSchema.index({ ownerId: 1, path: 1 });
// Составной текстовый индекс для поиска по title и meta.searchableContent
NoteSchema.index({ title: 'text', 'meta.searchableContent': 'text' });


export default model('Note', NoteSchema);
