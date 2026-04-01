import { makeAutoObservable } from 'mobx';
import RootStore from '@stores/RootStore';
import { FileTreeNode, NoteTag } from '@app-types/notes';

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
    isPinned?: boolean;
    isShared?: boolean;
    isPublic?: boolean;
    tags?: NoteTag[];
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
    draggingNode: { id: string; type: 'file' | 'folder'; isShared: boolean } | null = null;
    editingNodeId: string | null = null;
    editingMode: 'rename' | 'create-folder' | 'create-note' | 'create-subnote' | null = null;
    creatingParentId: string | null = null;
    showSharedNotes = false;
    sharedNotesReloadToken = 0;
    activeTagFilter: string | null = null;

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

    updateNode(id: string, data: Partial<Pick<FileTreeNode, 'name' | 'parentId' | 'tags'>>) {
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
    startDragging(id: string, type: 'file' | 'folder', isShared = false) {
        this.draggingNode = { id, type, isShared };
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
                isPinned: note.isPinned ?? false,
                tags: note.tags ?? [],
                isShared: note.isShared ?? note.meta?.isShared ?? false,
                isPublic: note.isPublic ?? false,
                excerpt: note.meta?.excerpt ?? undefined,
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

    get pinnedNotes(): FileTreeNode[] {
        const result: FileTreeNode[] = [];
        const collect = (nodes: FileTreeNode[]) => {
            for (const node of nodes) {
                if (node.type === 'file' && node.isPinned) result.push(node);
                if (node.children) collect(node.children);
            }
        };
        collect(this.fileTree);
        return result;
    }

    /**
     * Expand all ancestor nodes so that the target node becomes visible in the tree.
     */
    revealNode(nodeId: string) {
        const node = this.findNodeById(this.fileTree, nodeId);
        if (!node) return;
        // The node itself may be a folder — expand it too? No, just its parents.
        this.expandFolderPath(node.parentId);
    }

    togglePinNode(noteId: string, isPinned: boolean) {
        const node = this.findNodeById(this.fileTree, noteId);
        if (node) node.isPinned = isPinned;
    }

    setActiveTagFilter(tag: string | null) {
        this.activeTagFilter = this.activeTagFilter === tag ? null : tag;
    }

    get allTags(): string[] {
        const tags = new Set<string>();
        const collect = (nodes: FileTreeNode[]) => {
            for (const n of nodes) {
                n.tags?.forEach((t) => tags.add(t.name));
                if (n.children) collect(n.children);
            }
        };
        collect(this.fileTree);
        return Array.from(tags).sort();
    }

    // Фильтрация дерева по поисковому запросу
    toggleSharedNotes() {
        this.showSharedNotes = !this.showSharedNotes;
    }

    getFilteredTree(): FileTreeNode[] {
        let tree = this.showSharedNotes ? this.sharedNotes : this.fileTree;

        if (this.activeTagFilter) {
            tree = this.filterByTag(tree, this.activeTagFilter);
        }

        if (this.searchQuery.trim()) {
            const query = this.searchQuery.toLowerCase();
            tree = this.filterTree(tree, query);
        }

        return tree;
    }

    private filterByTag(nodes: FileTreeNode[], tag: string): FileTreeNode[] {
        const result: FileTreeNode[] = [];
        for (const node of nodes) {
            const matchesTag = node.tags?.some((t) => t.name === tag);
            const filteredChildren = node.children ? this.filterByTag(node.children, tag) : [];
            if (matchesTag || filteredChildren.length > 0) {
                result.push({
                    ...node,
                    children: filteredChildren.length > 0 ? filteredChildren : node.children,
                });
            }
        }
        return result;
    }

    private filterTree(nodes: FileTreeNode[], query: string): FileTreeNode[] {
        const result: FileTreeNode[] = [];
        const isTagQuery = query.startsWith('#');
        const tagQuery = isTagQuery ? query.slice(1) : '';

        for (const node of nodes) {
            const matchesName = node.name.toLowerCase().includes(query);
            const matchesTag = isTagQuery
                ? node.tags?.some((t) => t.name.toLowerCase().includes(tagQuery))
                : node.tags?.some((t) => t.name.toLowerCase().includes(query));
            const filteredChildren = node.children ? this.filterTree(node.children, query) : [];

            if (matchesName || matchesTag || filteredChildren.length > 0) {
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

    requestSharedNotesReload() {
        this.sharedNotesReloadToken = Date.now();
    }

    removeSharedNote(id: string) {
        const remove = (nodes: FileTreeNode[]): FileTreeNode[] =>
            nodes
                .filter(n => n.id !== id)
                .map(n => n.children ? { ...n, children: remove(n.children) } : n);
        this.sharedNotes = remove(this.sharedNotes);
    }
}

export default sidebarStore;
