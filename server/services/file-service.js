import { fileRepository, noteRepository } from '../repositories/index.js';
import noteAccessService from './note-access-service.js';
import storageService from './storage-service.js';
import ApiError from '../exceptions/api-error.js';
import FileDto from '../dtos/file-dto.js';
import sharp from 'sharp';

const IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const THUMBNAIL_WIDTH = 200;
const MAX_USER_STORAGE = 500 * 1024 * 1024; // 500 MB

class FileService {
    async upload(noteId, userId, file) {
        if (!file) {
            throw ApiError.BadRequest('No file provided');
        }

        // Verify note exists
        const note = await noteRepository.findById(noteId);
        if (!note || note.isDeleted) {
            throw ApiError.NotFoundError('Note not found');
        }

        // Check edit permission
        const permission = await noteAccessService.getUserPermissionForNote(userId, noteId);
        if (permission !== 'edit') {
            throw ApiError.ForbiddenError('Edit access required to upload files');
        }

        // Validate file type via magic bytes
        const { fileTypeFromBuffer } = await import('file-type');
        const detected = await fileTypeFromBuffer(file.buffer);
        if (detected && detected.mime !== file.mimetype) {
            // Use detected type if extension was spoofed
            file.mimetype = detected.mime;
        }

        // Check user quota
        const usedStorage = await fileRepository.getTotalSizeByUser(userId);
        if (usedStorage + file.size > MAX_USER_STORAGE) {
            throw ApiError.BadRequest(
                `Storage quota exceeded. Used: ${Math.round(usedStorage / 1024 / 1024)}MB / ${MAX_USER_STORAGE / 1024 / 1024}MB`
            );
        }

        // Multer decodes filenames as latin1; re-encode to UTF-8 for non-ASCII names
        const originalName = Buffer.from(file.originalname, 'latin1').toString('utf8');

        const isImage = IMAGE_MIME_TYPES.includes(file.mimetype);
        const storagePath = storageService.generateKey(noteId, originalName);

        // Upload original file
        await storageService.upload(storagePath, file.buffer, file.mimetype);

        // Generate and upload thumbnail for images
        let thumbnailPath = null;
        if (isImage && file.mimetype !== 'image/gif') {
            try {
                const thumbnailBuffer = await sharp(file.buffer)
                    .resize(THUMBNAIL_WIDTH)
                    .webp({ quality: 75 })
                    .toBuffer();

                thumbnailPath = storagePath.replace(/\.[^.]+$/, '_thumb.webp');
                await storageService.upload(thumbnailPath, thumbnailBuffer, 'image/webp');
            } catch (error) {
                console.error('[FileService] Thumbnail generation failed:', error.message);
                // Non-critical — continue without thumbnail
            }
        }

        // Save metadata to DB
        const fileRecord = await fileRepository.create({
            noteId,
            uploadedBy: userId,
            originalName,
            storagePath,
            mimeType: file.mimetype,
            size: file.size,
            isImage,
            thumbnailPath,
        });

        return this._toDto(fileRecord);
    }

    async getFilesByNote(noteId, userId) {
        const note = await noteRepository.findById(noteId);
        if (!note || note.isDeleted) {
            throw ApiError.NotFoundError('Note not found');
        }

        const permission = await noteAccessService.getUserPermissionForNote(userId, noteId);
        if (!permission) {
            throw ApiError.ForbiddenError('Access denied');
        }

        const files = await fileRepository.findByNoteId(noteId);
        return files.map((f) => this._toDto(f));
    }

    async deleteFile(noteId, fileId, userId) {
        const file = await fileRepository.findById(fileId);
        if (!file || file.isDeleted) {
            throw ApiError.NotFoundError('File not found');
        }

        if (file.noteId.toString() !== noteId) {
            throw ApiError.BadRequest('File does not belong to this note');
        }

        // Only uploader or note owner can delete
        const note = await noteRepository.findById(noteId);
        const isUploader = file.uploadedBy.toString() === userId;
        const isOwner = note && note.ownerId.toString() === userId;
        if (!isUploader && !isOwner) {
            throw ApiError.ForbiddenError('Only the uploader or note owner can delete this file');
        }

        // Delete from storage
        try {
            await storageService.delete(file.storagePath);
            if (file.thumbnailPath) {
                await storageService.delete(file.thumbnailPath);
            }
        } catch (error) {
            console.error('[FileService] Storage delete failed:', error.message);
        }

        // Hard delete from DB
        await fileRepository.deleteById(fileId);

        return { success: true };
    }

    async getFileForServing(fileId) {
        const file = await fileRepository.findById(fileId);
        if (!file || file.isDeleted) {
            throw ApiError.NotFoundError('File not found');
        }
        return file;
    }

    _toDto(file) {
        const fileId = file._id.toString();
        const url = `/api/files/${fileId}`;
        const thumbnailUrl = file.thumbnailPath
            ? `/api/files/${fileId}?thumb=1`
            : null;
        return new FileDto(file, url, thumbnailUrl);
    }
}

export default new FileService();
