class FileDto {
    constructor(file, fileUrl, thumbnailUrl) {
        this.id = file._id.toString();
        this.noteId = file.noteId.toString();
        this.originalName = file.originalName;
        this.mimeType = file.mimeType;
        this.size = file.size;
        this.isImage = file.isImage;
        this.url = fileUrl;
        this.thumbnailUrl = thumbnailUrl || null;
        this.createdAt = file.createdAt;
    }
}

export default FileDto;
