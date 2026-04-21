import mongoose from 'mongoose';

const InlineCommentSchema = new mongoose.Schema({
  noteId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Note',
    required: true,
    index: true
  },

  authorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },

  // Y.encodeRelativePosition(...) — CRDT-якорь, переживает конкурентные правки
  yjsAnchor: {
    type: Buffer,
    required: true
  },

  // Выделенный текст — только для отображения в панели
  anchorText: {
    type: String,
    default: null,
    maxlength: 500,
    trim: true
  },

  content: {
    type: String,
    required: true,
    trim: true,
    maxlength: 2000
  },

  reactions: [
    {
      userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      type: {
        type: String,
        enum: ['like', 'heart', 'laugh', 'sad', 'angry'],
        default: 'like'
      }
    }
  ],

  isResolved: { type: Boolean, default: false },
  isDeleted:  { type: Boolean, default: false },

}, { timestamps: true });

// Главный индекс: все открытые inline-комментарии к заметке, отсортированные по дате
InlineCommentSchema.index({ noteId: 1, isResolved: 1, createdAt: -1 });
// Активность пользователя
InlineCommentSchema.index({ authorId: 1, createdAt: -1 });

InlineCommentSchema.pre('save', function (next) {
  if (this.isModified('content') && !this.isNew) {
    this.isEdited = true;
  }
  next();
});

export default mongoose.model('InlineComment', InlineCommentSchema);
