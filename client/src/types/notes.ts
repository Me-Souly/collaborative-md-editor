/**
 * Типы для заметок и файлового дерева
 */

export interface Note {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface FileTreeNode {
  id: string;
  name: string;
  type: 'file' | 'folder';
  children?: FileTreeNode[];
  isFavorite?: boolean;
  isShared?: boolean;
  parentId?: string;
}

