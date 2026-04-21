class NoteDto {
    constructor(note, userId, _role) {
        this.id = note._id;
        this.title = note.title;
        this.rendered = note.meta?.searchableContent || '';
        // Владелец заметки (может быть ObjectId или populated объект)
        const ownerPopulated =
            note.ownerId && typeof note.ownerId === 'object' && note.ownerId.login;
        this.ownerId = ownerPopulated ? note.ownerId._id : note.ownerId;
        if (ownerPopulated) {
            this.ownerName = note.ownerId.login;
        }
        this.parentId = note.parentId;
        this.path = note.path ?? '/';
        this.isPublic = note.isPublic;
        this.isPinned = note.isPinned ?? false;
        this.tags = Array.isArray(note.tags)
            ? note.tags
                  .filter((t) => t && typeof t === 'object' && t.name)
                  .map((t) => ({ id: t._id, name: t.name, slug: t.slug }))
            : [];

        // Prepare meta object with excerpt fallback
        this.meta = { ...note.meta };
        // If excerpt is empty but searchableContent exists, use it (trimmed to 200 chars)
        if (!this.meta.excerpt && this.meta.searchableContent) {
            this.meta.excerpt = this.meta.searchableContent.trim().slice(0, 200);
        }

        this.updatedAt = note.updatedAt;
        this.createdAt = note.createdAt;
        this.deletedAt = note.deletedAt ?? null;
        this.isDeleted = note.isDeleted ?? false;

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

        // все, у кого есть доступ на чтение, видят список доступов
        if (this.canRead && Array.isArray(note.access)) {
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
