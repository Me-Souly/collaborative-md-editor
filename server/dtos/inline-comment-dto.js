class InlineCommentDto {
  constructor(comment, currentUserId, noteOwnerId) {
    this.id       = comment._id;
    this.noteId   = comment.noteId;

    // Buffer → base64 для передачи через JSON.
    // .lean() may return MongoDB Binary (Uint8Array subclass) instead of Buffer —
    // handle all cases explicitly.
    // Buffer → base64. .lean() returns MongoDB Binary whose .buffer is a Node.js Buffer.
    // Buffer → base64. .lean() returns MongoDB Binary whose .buffer may be oversized —
    // actual byte count is stored in .position. Non-lean returns a real Node.js Buffer.
    const rawAnchor = comment.yjsAnchor;
    let anchorBuf = null;
    if (rawAnchor) {
        if (Buffer.isBuffer(rawAnchor)) {
            anchorBuf = rawAnchor;
        } else if (rawAnchor.buffer && Buffer.isBuffer(rawAnchor.buffer)) {
            // MongoDB Binary from .lean(): .position is the real length
            const len = typeof rawAnchor.position === 'number' ? rawAnchor.position : rawAnchor.buffer.length;
            anchorBuf = rawAnchor.buffer.slice(0, len);
        } else if (rawAnchor instanceof Uint8Array) {
            anchorBuf = Buffer.from(rawAnchor.buffer, rawAnchor.byteOffset, rawAnchor.byteLength);
        } else if (Array.isArray(rawAnchor.data)) {
            anchorBuf = Buffer.from(rawAnchor.data);
        }
    }
    this.yjsAnchor = anchorBuf && anchorBuf.length > 0 ? anchorBuf.toString('base64') : null;
    this.anchorText = comment.anchorText || null;

    this.content   = comment.isDeleted ? '[deleted]' : comment.content;
    this.isDeleted = comment.isDeleted;
    this.isResolved = comment.isResolved;

    if (comment.authorId && typeof comment.authorId === 'object') {
      this.author = {
        id:       comment.authorId._id,
        username: comment.authorId.login ?? comment.authorId.name,
        avatar:   comment.authorId.avatar || null
      };
    } else {
      this.author = { id: comment.authorId };
    }

    if (Array.isArray(comment.reactions)) {
      const counts = comment.reactions.reduce((acc, r) => {
        acc[r.type] = (acc[r.type] || 0) + 1;
        return acc;
      }, {});
      this.reactions = counts;

      const userReaction = comment.reactions.find(
        r => r.userId?.toString() === currentUserId?.toString()
      );
      this.myReaction = userReaction ? userReaction.type : null;
    } else {
      this.reactions  = {};
      this.myReaction = null;
    }

    this.isOwner    = comment.authorId?.toString?.() === currentUserId?.toString();
    this.canDelete  = this.isOwner;
    this.canResolve = noteOwnerId?.toString?.() === currentUserId?.toString();

    this.createdAt = comment.createdAt;
    this.updatedAt = comment.updatedAt || comment.createdAt;
  }
}

export default InlineCommentDto;
