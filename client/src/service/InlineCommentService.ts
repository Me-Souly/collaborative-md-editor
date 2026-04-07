import $api from '@http/index';
import { AxiosResponse } from 'axios';

export interface InlineCommentAuthor {
    id: string;
    username: string;
    avatar?: string | null;
}

export interface InlineComment {
    id: string;
    noteId: string;
    /** base64-encoded Y.RelativePosition — CRDT-якорь */
    yjsAnchor: string;
    /** Выделенный текст (для отображения чипа в панели) */
    anchorText: string | null;
    content: string;
    author: InlineCommentAuthor;
    isDeleted: boolean;
    isResolved: boolean;
    createdAt: string;
    updatedAt: string;
    reactions: Record<string, number>;
    myReaction: string | null;
    isOwner: boolean;
    canDelete: boolean;
    canResolve: boolean;
}

export interface CreateInlineCommentDto {
    content: string;
    /** base64-encoded Y.RelativePosition */
    yjsAnchor: string;
    anchorText?: string;
}

export class InlineCommentService {
    static getByNote(noteId: string): Promise<AxiosResponse<InlineComment[]>> {
        return $api.get(`/notes/${noteId}/inline-comments`);
    }

    static create(noteId: string, body: CreateInlineCommentDto): Promise<AxiosResponse<InlineComment>> {
        return $api.post(`/notes/${noteId}/inline-comments`, body);
    }

    static resolve(commentId: string): Promise<AxiosResponse<InlineComment>> {
        return $api.patch(`/inline-comments/${commentId}/resolve`);
    }

    static delete(commentId: string): Promise<AxiosResponse<unknown>> {
        return $api.delete(`/inline-comments/${commentId}`);
    }

    static react(commentId: string, reactionType: string): Promise<AxiosResponse<InlineComment>> {
        return $api.post(`/inline-comments/${commentId}/react`, { reactionType });
    }
}
