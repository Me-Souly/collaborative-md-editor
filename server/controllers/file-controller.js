import { fileService } from '../services/index.js';

class FileController {
    async upload(req, res, next) {
        try {
            const userId = req.user.id;
            const noteId = req.params.id;
            const file = req.file;

            const result = await fileService.upload(noteId, userId, file);
            return res.json(result);
        } catch (e) {
            next(e);
        }
    }

    async getByNote(req, res, next) {
        try {
            const userId = req.user.id;
            const noteId = req.params.id;

            const files = await fileService.getFilesByNote(noteId, userId);
            return res.json(files);
        } catch (e) {
            next(e);
        }
    }

    async deleteFile(req, res, next) {
        try {
            const userId = req.user.id;
            const noteId = req.params.id;
            const fileId = req.params.fileId;

            const result = await fileService.deleteFile(noteId, fileId, userId);
            return res.json(result);
        } catch (e) {
            next(e);
        }
    }

    async serveFile(req, res, next) {
        try {
            const fileId = req.params.fileId;
            const file = await fileService.getFileForServing(fileId);

            const storageService = (await import('../services/storage-service.js')).default;

            // If public URL is configured, redirect to storage directly
            if (storageService.publicUrl) {
                const key = req.query.thumb && file.thumbnailPath
                    ? file.thumbnailPath : file.storagePath;
                const url = `${storageService.publicUrl}/${storageService.bucket}/${key}`;
                return res.redirect(url);
            }

            // Proxy from S3
            const { GetObjectCommand } = await import('@aws-sdk/client-s3');
            const key = req.query.thumb && file.thumbnailPath
                ? file.thumbnailPath : file.storagePath;
            const client = storageService._getClient();
            const response = await client.send(new GetObjectCommand({
                Bucket: storageService.bucket,
                Key: key,
            }));

            const disposition = file.isImage ? 'inline' : 'attachment';
            res.set('Content-Type', file.mimeType);
            res.set('Content-Disposition', `${disposition}; filename="${encodeURIComponent(file.originalName)}"`);
            res.set('Cache-Control', 'public, max-age=31536000, immutable');
            res.set('Cross-Origin-Resource-Policy', 'cross-origin');
            response.Body.pipe(res);
        } catch (e) {
            next(e);
        }
    }
}

export default new FileController();
