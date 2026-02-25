class NoteDto {
    constructor(note, userId) {
        this.id = note._id;
        this.title = note.title;
        // this.content = note.ydocState;
        this.rendered = note.rendered;
        // Владелец заметки (может быть ObjectId или populated объект)
        const ownerPopulated =
            note.ownerId && typeof note.ownerId === 'object' && note.ownerId.username;
        this.ownerId = ownerPopulated ? note.ownerId._id : note.ownerId;
        if (ownerPopulated) {
            this.ownerName = note.ownerId.username;
        }
        this.folderId = note.folderId;
        this.parentId = note.parentId;
        this.isPublic = note.isPublic;

        // Prepare meta object with excerpt fallback
        this.meta = { ...note.meta };
        // If excerpt is empty but searchableContent exists, use it (trimmed to 200 chars)
        if (!this.meta.excerpt && this.meta.searchableContent) {
            this.meta.excerpt = this.meta.searchableContent.trim().slice(0, 200);
        }

        this.updatedAt = note.updatedAt;
        this.createdAt = note.createdAt;

        // определение доступа (используем this.ownerId — уже нормализованный)
        this.isOwner = this.ownerId && this.ownerId.toString() === userId?.toString();

        // Определяем тип доступа пользователя
        if (this.isOwner) {
            this.permission = 'edit'; // Владелец всегда имеет полный доступ
        } else {
            const userAccess = note.access?.find(
                (a) => a.userId && a.userId.toString() === userId?.toString(),
            );
            if (userAccess) {
                this.permission = userAccess.permission; // 'read' или 'edit'
            } else if (note.isPublic) {
                // Публичные заметки доступны для чтения даже без явного доступа
                this.permission = 'read';
            } else {
                this.permission = null; // Нет доступа
            }
        }

        this.canEdit = this.permission === 'edit';
        this.canRead = this.permission === 'read' || this.permission === 'edit';

        // владелец видит, кому дал доступ
        if (this.isOwner && Array.isArray(note.access)) {
            this.access = note.access.map((a) => ({
                userId: a.userId,
                permission: a.permission,
                grantedBy: a.grantedBy,
                createdAt: a.createdAt,
            }));
        }
    }
}

export default NoteDto;
