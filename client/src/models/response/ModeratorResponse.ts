/**
 * Типы ответов API для модератора
 */

export interface PublicNoteForModerator {
  id: string;
  title: string;
  ownerId: string;
  author: {
    id: string;
    name: string;
    login: string;
    email: string;
  } | null;
  contentPreview: string;
  createdAt: string;
  updatedAt: string;
  isPublic: boolean;
}

export interface ModeratorActionResponse {
  success: boolean;
  message: string;
}

