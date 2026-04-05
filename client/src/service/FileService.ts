import $api, { API_URL } from "@http";
import type { AxiosResponse } from "axios";

export interface UploadedFile {
    id: string;
    noteId: string;
    originalName: string;
    mimeType: string;
    size: number;
    url: string;
    thumbnailUrl?: string;
    isImage: boolean;
    createdAt: string;
}

export default class FileService {
    /**
     * Resolve a server-relative file path (e.g. "/api/files/abc") into a
     * full URL reachable from the browser.  In dev the API lives on a
     * different port, so we must prepend the API origin.
     */
    static resolveUrl(path: string): string {
        try {
            return new URL(path, API_URL).href;
        } catch {
            return path;
        }
    }

    static async upload(noteId: string, file: File): Promise<AxiosResponse<UploadedFile>> {
        const formData = new FormData();
        formData.append('file', file);

        return $api.post(`/notes/${noteId}/files`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
    }

    static async getFiles(noteId: string): Promise<AxiosResponse<UploadedFile[]>> {
        return $api.get(`/notes/${noteId}/files`);
    }

    static async deleteFile(noteId: string, fileId: string): Promise<AxiosResponse<void>> {
        return $api.delete(`/notes/${noteId}/files/${fileId}`);
    }
}
