import mongoose from 'mongoose';

const CommentSchema = new mongoose.Schema({
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

  parentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Comment',
    default: null
  },

  content: {
    type: String,
    required: true,
    trim: true,
    maxlength: 5000
  },

  reactions: [
    {
      userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      type: {
        type: String,
        enum: ['like', 'dislike', 'heart', 'laugh', 'sad', 'angry'],
        default: 'like'
      }
    }
  ],

  isDeleted: { type: Boolean, default: false },

  isEdited: { type: Boolean, default: false },

}, { timestamps: true });

CommentSchema.index({ noteId: 1, createdAt: -1 }); // комментарии заметки, сортировка по дате
CommentSchema.index({ parentId: 1, createdAt: 1 }); // ответы на конкретный комментарий
CommentSchema.index({ authorId: 1, createdAt: -1 }); // активность пользователя

CommentSchema.pre('save', function(next) {
  if (this.isModified('content') && !this.isNew) {
    this.isEdited = true;
    this.editedAt = new Date();
  }
  next();
});

export default mongoose.model('Comment', CommentSchema);