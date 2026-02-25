class CommentDto {
  constructor(comment, currentUserId) {
    this.id = comment._id;
    this.noteId = comment.noteId;
    this.parentId = comment.parentId || null;

    // показываем [deleted], если комментарий удалён
    this.content = comment.isDeleted ? '[deleted]' : comment.content;

    // информация об авторе (если загружена через populate)
    if (comment.authorId && typeof comment.authorId === 'object') {
      this.author = {
        id: comment.authorId._id,
        username: comment.authorId.username,
        avatar: comment.authorId.avatar || null
      };
    } else {
      this.author = { id: comment.authorId };
    }

    this.isDeleted = comment.isDeleted;
    this.isEdited = comment.isEdited;
    this.createdAt = comment.createdAt;
    this.updatedAt = comment.updatedAt || comment.editedAt || comment.createdAt;

    // реакции — суммарное представление
    if (Array.isArray(comment.reactions)) {
      const counts = comment.reactions.reduce((acc, r) => {
        acc[r.type] = (acc[r.type] || 0) + 1;
        return acc;
      }, {});
      this.reactions = counts;

      // текущий пользователь: какую реакцию поставил
      const userReaction = comment.reactions.find(r => r.userId?.toString() === currentUserId?.toString());
      this.myReaction = userReaction ? userReaction.type : null;
    } else {
      this.reactions = {};
      this.myReaction = null;
    }

    // права пользователя
    this.isOwner = comment.authorId?.toString?.() === currentUserId?.toString();
    this.canDelete = this.isOwner; // пока просто автор может удалять
  }
}

export default CommentDto;
