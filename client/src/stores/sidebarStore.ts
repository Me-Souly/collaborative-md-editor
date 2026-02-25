import { makeAutoObservable } from 'mobx';
import RootStore from '@stores/RootStore';
import { FileTreeNode } from '@app-types/notes';

type FolderNodeInput = {
    id: string;
    name?: string;
    title?: string;
    parentId?: string | null;
};

type NoteNodeInput = {
    id: string;
    title?: string;
    folderId?: string | null;
    parentId?: string | null;
    isFavorite?: boolean;
    isShared?: boolean;
    meta?: Record<string, any>;
};

/**
 * Store для управления sidebar
 * Отвечает за:
 * - Состояние collapsed/expanded
 * - Файловое дерево заметок
 * - Выбранную заметку
 * - Поиск
 */
class sidebarStore {
    rootStore: RootStore;

    // Состояние
    collapsed = false;
    fileTree: FileTreeNode[] = [];
    sharedNotes: FileTreeNode[] = [];
    selectedNoteId: string | null = null;
    searchQuery = '';
    expandedFolders: Set<string> = new Set();
    draggingNode: { id: string; type: 'file' | 'folder' } | null = null;
    editingNodeId: string | null = null;
    editingMode: 'rename' | 'create-folder' | 'create-note' | 'create-subnote' | null = null;
    creatingParentId: string | null = null;
    showSharedNotes = false;

    constructor(rootStore: RootStore) {
        this.rootStore = rootStore;
        makeAutoObservable(this);
        this.restoreExpandedFolders();
    }

    private restoreExpandedFolders() {
        try {
            const saved = localStorage.getItem('expandedFolders');
            if (saved) {
                this.expandedFolders = new Set(JSON.parse(saved));
            }
        } catch {
            /* ignore */
        }
    }

    private persistExpandedFolders() {
        try {
            localStorage.setItem(
                'expandedFolders',
                JSON.stringify(Array.from(this.expandedFolders)),
            );
        } catch {
            /* ignore */
        }
    }

    // Actions
    toggleCollapse() {
        this.collapsed = !this.collapsed;
    }

    setCollapsed(collapsed: boolean) {
        this.collapsed = collapsed;
    }

    setFileTree(tree: FileTreeNode[]) {
        this.fileTree = tree;
    }

    updateNode(id: string, data: Partial<Pick<FileTreeNode, 'name' | 'parentId'>>) {
        const node = this.findNodeById(this.fileTree, id);
        if (!node) return;
        Object.assign(node, data);
    }

    addNodeFromServer(entity: {
        id: string;
        title: string;
        type: 'file' | 'folder';
        parentId?: string | null;
        folderId?: string | null;
    }) {
        const node: FileTreeNode = {
            id: entity.id,
            name: entity.title || 'Untitled',
            type: entity.type === 'folder' ? 'folder' : 'file',
            parentId: entity.parentId ?? undefined,
            children: [],
        };

        if (node.type === 'folder') {
            if (node.parentId) {
                const parent = this.findNodeById(this.fileTree, node.parentId);
                if (parent && parent.type === 'folder') {
                    parent.children = parent.children || [];
                    parent.children.push(node);
                    return;
                }
            }
            this.fileTree.push(node);
            return;
        }

        // file: сначала пытаемся как подзаметку
        if (entity.parentId) {
            const parentNote = this.findNodeById(this.fileTree, entity.parentId);
            if (parentNote) {
                parentNote.children = parentNote.children || [];
                parentNote.children.push(node);
                return;
            }
        }

        // потом как заметку внутри папки
        if (entity.folderId) {
            const parentFolder = this.findNodeById(this.fileTree, entity.folderId);
            if (parentFolder && parentFolder.type === 'folder') {
                parentFolder.children = parentFolder.children || [];
                parentFolder.children.push(node);
                return;
            }
        }

        this.fileTree.push(node);
    }

    setSelectedNoteId(noteId: string | null) {
        this.selectedNoteId = noteId;
    }

    setSearchQuery(query: string) {
        this.searchQuery = query;
    }

    toggleFolder(folderId: string) {
        if (this.expandedFolders.has(folderId)) {
            this.expandedFolders.delete(folderId);
        } else {
            this.expandedFolders.add(folderId);
        }
        this.persistExpandedFolders();
    }

    // drag & drop
    startDragging(id: string, type: 'file' | 'folder') {
        this.draggingNode = { id, type };
    }

    stopDragging() {
        this.draggingNode = null;
    }

    canDropOn(target: FileTreeNode): boolean {
        if (!this.draggingNode) return false;
        if (this.draggingNode.id === target.id) return false;

        const draggedNode = this.findNodeById(this.fileTree, this.draggingNode.id);
        if (!draggedNode) return false;

        // запрещаем кидать в собственного потомка (для папок и заметок с детьми)
        if (this.isDescendant(draggedNode, target.id)) return false;

        // Папки можно вкладывать только в папки
        if (this.draggingNode.type === 'folder') {
            return target.type === 'folder';
        }

        // Заметки (file) можно вкладывать и в папки, и в другие заметки
        if (this.draggingNode.type === 'file') {
            return true;
        }

        return false;
    }

    canDropToRoot(): boolean {
        return !!this.draggingNode;
    }

    private isDescendant(node: FileTreeNode, targetId: string): boolean {
        if (!node.children) return false;
        for (const child of node.children) {
            if (child.id === targetId) return true;
            if (this.isDescendant(child, targetId)) return true;
        }
        return false;
    }

    moveNode(dragId: string, dragType: 'file' | 'folder', targetFolderId: string | null) {
        if (dragType === 'file') {
            // обновляем только структуру дерева; сервер обновляется на уровне страницы
            const node = this.findNodeById(this.fileTree, dragId);
            if (!node) return;
            // удаляем из старого места
            this.fileTree = this.removeNodeById(this.fileTree, dragId);
            node.parentId = targetFolderId ?? undefined;
            if (targetFolderId) {
                const parent = this.findNodeById(this.fileTree, targetFolderId);
                if (parent) {
                    parent.children = parent.children || [];
                    parent.children.push(node);
                    return;
                }
            }
            this.fileTree.push(node);
        } else {
            // перемещение папки
            if (dragId === targetFolderId) return;
            const node = this.findNodeById(this.fileTree, dragId);
            if (!node) return;
            this.fileTree = this.removeNodeById(this.fileTree, dragId);
            node.parentId = targetFolderId ?? undefined;
            if (targetFolderId) {
                const parent = this.findNodeById(this.fileTree, targetFolderId);
                if (parent && parent.type === 'folder') {
                    parent.children = parent.children || [];
                    parent.children.push(node);
                    return;
                }
            }
            this.fileTree.push(node);
        }
    }

    isFolderExpanded(folderId: string): boolean {
        return this.expandedFolders.has(folderId);
    }

    // Методы для работы с файловым деревом
    addNode(parentId: string | null, node: FileTreeNode) {
        if (parentId === null) {
            this.fileTree.push(node);
        } else {
            const parent = this.findNodeById(this.fileTree, parentId);
            if (parent && parent.type === 'folder') {
                if (!parent.children) {
                    parent.children = [];
                }
                parent.children.push(node);
            }
        }
    }

    deleteNode(nodeId: string) {
        this.fileTree = this.removeNodeById(this.fileTree, nodeId);
        if (this.selectedNoteId === nodeId) {
            this.selectedNoteId = null;
        }
    }

    private findNodeById(nodes: FileTreeNode[], id: string): FileTreeNode | null {
        for (const node of nodes) {
            if (node.id === id) {
                return node;
            }
            if (node.children) {
                const found = this.findNodeById(node.children, id);
                if (found) return found;
            }
        }
        return null;
    }

    private removeNodeById(nodes: FileTreeNode[], id: string): FileTreeNode[] {
        return nodes
            .filter((node) => node.id !== id)
            .map((node) => {
                if (node.children) {
                    return {
                        ...node,
                        children: this.removeNodeById(node.children, id),
                    };
                }
                return node;
            });
    }

    // Построение дерева файлов из списка папок и заметок
    buildFileTree(folders: FolderNodeInput[] = [], notes: NoteNodeInput[] = []) {
        const folderMap = new Map<string, FileTreeNode>();
        const rootNodes: FileTreeNode[] = [];

        // Создаем узлы папок
        folders.forEach((folder) => {
            const parentId = folder.parentId ?? undefined;

            folderMap.set(folder.id, {
                id: folder.id,
                name: folder.name || folder.title || 'Folder',
                type: 'folder',
                parentId,
                children: [],
            });
        });

        // Привязываем папки к родителям или корню
        folderMap.forEach((folderNode) => {
            if (folderNode.parentId && folderMap.has(folderNode.parentId)) {
                const parent = folderMap.get(folderNode.parentId)!;
                parent.children = parent.children || [];
                parent.children.push(folderNode);
            } else {
                rootNodes.push(folderNode);
            }
        });

        // Сначала создаём все заметки как отдельные узлы
        const noteMap = new Map<string, FileTreeNode>();
        notes.forEach((note) => {
            noteMap.set(note.id, {
                id: note.id,
                name: note.title || 'Untitled',
                type: 'file',
                parentId: note.parentId ?? undefined,
                isFavorite:
                    note.isFavorite ?? note.meta?.isFavorite ?? note.meta?.favorite ?? false,
                isShared: note.isShared ?? note.meta?.isShared ?? false,
                children: [],
            });
        });

        // Затем привязываем заметки к родителям (другим заметкам или папкам) или к корню
        notes.forEach((note) => {
            const node = noteMap.get(note.id);
            if (!node) return;

            // Сначала проверяем parentId (подзаметки)
            if (note.parentId && noteMap.has(note.parentId)) {
                const parentNoteNode = noteMap.get(note.parentId)!;
                parentNoteNode.children = parentNoteNode.children || [];
                parentNoteNode.children.push(node);
                return;
            }

            // Затем folderId (заметки внутри папок)
            if (note.folderId && folderMap.has(note.folderId)) {
                const parentFolderNode = folderMap.get(note.folderId)!;
                parentFolderNode.children = parentFolderNode.children || [];
                parentFolderNode.children.push(node);
                return;
            }

            // Иначе — в корень
            rootNodes.push(node);
        });

        this.fileTree = rootNodes;

        // Очищаем раскрытые папки, которых больше нет
        this.expandedFolders = new Set(
            Array.from(this.expandedFolders).filter(
                (folderId) => !!this.findNodeById(this.fileTree, folderId),
            ),
        );
        this.persistExpandedFolders();
    }

    expandFolderPath(folderId: string | null | undefined) {
        let currentId = folderId || null;
        while (currentId) {
            this.expandedFolders.add(currentId);
            const folderNode = this.findNodeById(this.fileTree, currentId);
            currentId = folderNode?.parentId ?? null;
        }
        this.persistExpandedFolders();
    }

    // Фильтрация дерева по поисковому запросу
    toggleSharedNotes() {
        this.showSharedNotes = !this.showSharedNotes;
    }

    getFilteredTree(): FileTreeNode[] {
        const tree = this.showSharedNotes ? this.sharedNotes : this.fileTree;
        if (!this.searchQuery.trim()) {
            return tree;
        }

        const query = this.searchQuery.toLowerCase();
        // Используем tree вместо this.fileTree для корректной фильтрации
        return this.filterTree(tree, query);
    }

    private filterTree(nodes: FileTreeNode[], query: string): FileTreeNode[] {
        const result: FileTreeNode[] = [];

        for (const node of nodes) {
            const matchesQuery = node.name.toLowerCase().includes(query);
            const filteredChildren = node.children ? this.filterTree(node.children, query) : [];

            if (matchesQuery || filteredChildren.length > 0) {
                result.push({
                    ...node,
                    children: filteredChildren.length > 0 ? filteredChildren : node.children,
                });
            }
        }

        return result;
    }

    // Редактирование узлов
    startEditing(
        nodeId: string,
        mode: 'rename' | 'create-folder' | 'create-note' | 'create-subnote',
        parentId?: string | null,
    ) {
        this.editingNodeId = nodeId;
        this.editingMode = mode;
        this.creatingParentId = parentId ?? null;
        if (parentId) {
            this.expandedFolders.add(parentId);
        }
    }

    stopEditing() {
        this.editingNodeId = null;
        this.editingMode = null;
        this.creatingParentId = null;
    }

    isEditing(nodeId: string): boolean {
        return this.editingNodeId === nodeId;
    }

    getEditingMode(): 'rename' | 'create-folder' | 'create-note' | 'create-subnote' | null {
        return this.editingMode;
    }
}

export default sidebarStore;
