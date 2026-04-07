import $api from '@http/index';
import { AxiosResponse } from 'axios';

export interface CommentAuthor {
    id: string;
    username: string;
    avatar?: string | null;
}

export interface Comment {
    id: string;
    noteId: string;
    parentId: string | null;
    content: string;
    author: CommentAuthor;
    isDeleted: boolean;
    isEdited: boolean;
    createdAt: string;
    updatedAt: string;
    reactions: Record<string, number>;
    myReaction: string | null;
    isOwner: boolean;
    canDelete: boolean;
}

export class CommentService {
    static getByNote(noteId: string): Promise<AxiosResponse<Comment[]>> {
        return $api.get(`/notes/${noteId}/comments`);
    }

    static create(noteId: string, content: string, parentId?: string): Promise<AxiosResponse<Comment>> {
        return $api.post(`/notes/${noteId}/comments`, { content, parentId: parentId ?? null });
    }

    static delete(commentId: string): Promise<AxiosResponse<unknown>> {
        return $api.delete(`/comments/${commentId}`);
    }

    static react(commentId: string, type: string): Promise<AxiosResponse<Comment>> {
        return $api.post(`/comments/${commentId}/react`, { type });
    }
}
