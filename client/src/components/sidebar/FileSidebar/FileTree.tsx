import React, { useCallback, useRef } from 'react';
import { observer } from 'mobx-react-lite';
import { useSidebarStore } from '@hooks/useStores';
import { TreeNode } from '@components/sidebar/FileSidebar/TreeNode';
import { SearchIcon, UsersIcon2, FileTextIcon, PinIcon } from '@components/common/ui/icons';
import * as styles from '@components/sidebar/FileSidebar.module.css';
import $api from '@http';

const cn = (...classes: (string | undefined | false)[]) => classes.filter(Boolean).join(' ');

interface FileTreeProps {
    currentNoteId?: string;
    onSelectNote: (id: string) => void;
}

export const FileTree: React.FC<FileTreeProps> = observer(({ currentNoteId, onSelectNote }) => {
    const sidebarStore = useSidebarStore();
    const contentRef = useRef<HTMLDivElement>(null);
    const filteredTree = sidebarStore.getFilteredTree();

    const handlePinnedClick = useCallback((id: string) => {
        // Reveal parents first, scroll instantly, then navigate
        sidebarStore.revealNode(id);
        requestAnimationFrame(() => {
            const container = contentRef.current;
            const node = container?.querySelector(`[data-node-id="${id}"]`) as HTMLElement | null;
            if (container && node) {
                const top = node.offsetTop - container.offsetTop;
                container.scrollTop = Math.max(0, top - 40);
            }
            onSelectNote(id);
        });
    }, [onSelectNote, sidebarStore]);

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        if (!sidebarStore.canDropToRoot()) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        const dragging = sidebarStore.draggingNode;
        if (!dragging || !sidebarStore.canDropToRoot()) return;

        sidebarStore.moveNode(dragging.id, dragging.type, null);
        sidebarStore.stopDragging();

        // Дроп в корень: обнуляем parentId (и folderId для заметок)
        if (dragging.type === 'file') {
            $api.put(`/notes/${dragging.id}`, { parentId: null, folderId: null }).catch((err) => {
                console.error('Failed to move note to root:', err);
            });
        } else {
            $api.put(`/folders/${dragging.id}`, { parentId: null }).catch((err) => {
                console.error('Failed to move folder to root:', err);
            });
        }
    };

    // Check if we're creating a node in root
    const isCreatingInRoot =
        sidebarStore.creatingParentId === null &&
        sidebarStore.editingNodeId !== null &&
        sidebarStore.editingNodeId.startsWith('temp-');

    const isEmpty = filteredTree.length === 0 && !isCreatingInRoot;
    const isSearching = !!sidebarStore.searchQuery.trim();
    const isShared = sidebarStore.showSharedNotes;

    return (
        <div className={styles.fileTree}>
            <div ref={contentRef} className={styles.fileTreeContent} onDragOver={handleDragOver} onDrop={handleDrop}>
                {isEmpty && !sidebarStore.collapsed && (
                    <div className={styles.emptyState}>
                        {isSearching ? (
                            <>
                                <SearchIcon className={styles.emptyStateIconSvg} />
                                <p className={styles.emptyStateText}>Nothing found</p>
                            </>
                        ) : isShared ? (
                            <>
                                <UsersIcon2 className={styles.emptyStateIconSvg} />
                                <p className={styles.emptyStateText}>No shared notes yet</p>
                            </>
                        ) : (
                            <>
                                <FileTextIcon className={styles.emptyStateIconSvg} />
                                <p className={styles.emptyStateText}>No notes yet</p>
                                <p className={styles.emptyStateHint}>Use + to create one</p>
                            </>
                        )}
                    </div>
                )}
                {sidebarStore.pinnedNotes.length > 0 && !sidebarStore.collapsed && (
                    <>
                        <div className={styles.pinnedLabel}>Pinned</div>
                        {sidebarStore.pinnedNotes.map((node) => (
                            <button
                                key={`pinned-${node.id}`}
                                className={cn(
                                    styles.pinnedItem,
                                    currentNoteId === node.id && styles.pinnedItemActive,
                                )}
                                onClick={() => handlePinnedClick(node.id)}
                            >
                                <PinIcon className={styles.pinnedItemIcon} />
                                <span className={styles.pinnedItemName}>{node.name}</span>
                            </button>
                        ))}
                        <div className={styles.pinnedDivider} />
                    </>
                )}
                {filteredTree.map((node) => (
                    <TreeNode
                        key={node.id}
                        node={node}
                        level={0}
                        collapsed={sidebarStore.collapsed}
                        currentNoteId={currentNoteId}
                        onSelectNote={onSelectNote}
                    />
                ))}
                {isCreatingInRoot && sidebarStore.editingNodeId && (
                    <TreeNode
                        key={sidebarStore.editingNodeId}
                        node={{
                            id: sidebarStore.editingNodeId,
                            name: '',
                            type: sidebarStore.editingMode === 'create-folder' ? 'folder' : 'file',
                            parentId: undefined,
                        }}
                        level={0}
                        collapsed={sidebarStore.collapsed}
                        currentNoteId={currentNoteId}
                        onSelectNote={onSelectNote}
                    />
                )}
            </div>
        </div>
    );
});
