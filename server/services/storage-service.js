import { S3Client, PutObjectCommand, DeleteObjectCommand, HeadBucketCommand, CreateBucketCommand } from '@aws-sdk/client-s3';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';

class StorageService {
    constructor() {
        this.client = null;
        this.bucket = process.env.STORAGE_BUCKET || 'note-editor-files';
        this.publicUrl = process.env.STORAGE_PUBLIC_URL || '';
        this._initialized = false;
    }

    _getClient() {
        if (!this.client) {
            const endpoint = process.env.STORAGE_ENDPOINT;
            if (!endpoint) {
                throw new Error('STORAGE_ENDPOINT is not configured');
            }

            this.client = new S3Client({
                endpoint,
                region: process.env.STORAGE_REGION || 'us-east-1',
                credentials: {
                    accessKeyId: process.env.STORAGE_ACCESS_KEY || 'minioadmin',
                    secretAccessKey: process.env.STORAGE_SECRET_KEY || 'minioadmin',
                },
                forcePathStyle: true, // Required for MinIO
            });
        }
        return this.client;
    }

    async init() {
        if (this._initialized) return;
        try {
            const client = this._getClient();
            // Check if bucket exists
            try {
                await client.send(new HeadBucketCommand({ Bucket: this.bucket }));
            } catch {
                // Bucket doesn't exist — create it
                console.log(`[StorageService] Creating bucket: ${this.bucket}`);
                await client.send(new CreateBucketCommand({ Bucket: this.bucket }));
            }
            this._initialized = true;
            console.log(`[StorageService] Connected to ${process.env.STORAGE_ENDPOINT}, bucket: ${this.bucket}`);
        } catch (error) {
            console.error('[StorageService] Init failed:', error.message);
            // Non-blocking: app works without storage, uploads will fail gracefully
        }
    }

    /**
     * Generate a unique storage path for a file
     */
    generateKey(noteId, originalName) {
        const ext = path.extname(originalName).toLowerCase() || '.bin';
        return `notes/${noteId}/${uuidv4()}${ext}`;
    }

    /**
     * Upload a file buffer to storage
     */
    async upload(key, buffer, mimeType) {
        const client = this._getClient();
        await client.send(new PutObjectCommand({
            Bucket: this.bucket,
            Key: key,
            Body: buffer,
            ContentType: mimeType,
        }));
        return this.getUrl(key);
    }

    /**
     * Delete a file from storage
     */
    async delete(key) {
        const client = this._getClient();
        await client.send(new DeleteObjectCommand({
            Bucket: this.bucket,
            Key: key,
        }));
    }

    /**
     * Get the direct storage URL for a file (only when publicUrl is configured).
     * Returns null if no public URL — caller should use the API proxy instead.
     */
    getUrl(key) {
        if (this.publicUrl) {
            return `${this.publicUrl.replace(/\/$/, '')}/${this.bucket}/${key}`;
        }
        return null;
    }
}

export default new StorageService();
