import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { FileSidebar } from '@components/sidebar/FileSidebar';
import { TrashIcon, RestoreIcon } from '@components/common/ui/icons';
import { Modal } from '@components/common/ui/Modal';
import { useModal } from '@hooks/useModal';
import { useSidebarStore } from '@hooks/useStores';
import $api from '@http';
import * as styles from '@pages/TrashPage.module.css';

// ── Types ─────────────────────────────────────────────────────────────────────

interface TrashItem {
    id: string;
    title: string;
    type: 'folder' | 'note';
    /** Для папки: id родительской папки. Для заметки: id родительской заметки (sub-note). */
    parentId: string | null;
    /** Только для заметок: папка, в которой лежит заметка. */
    folderId: string | null;
    deletedAt: string | null;
}

interface TrashTreeNode {
    item: TrashItem;
    children: TrashTreeNode[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const cn = (...classes: (string | undefined | false)[]) => classes.filter(Boolean).join(' ');

function formatDate(dateStr: string | null): string {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('ru', { day: 'numeric', month: 'short' });
}

function countDescendants(node: TrashTreeNode): number {
    return node.children.reduce((sum, child) => sum + 1 + countDescendants(child), 0);
}

function collectAllIds(node: TrashTreeNode, into: Set<string>) {
    into.add(node.item.id);
    node.children.forEach((c) => collectAllIds(c, into));
}

/**
 * Строит единое дерево из папок и заметок произвольной глубины.
 * Правила родительства:
 *   - Папка → её parentId (другая папка)
 *   - Заметка → parentId (родительская заметка), или folderId (папка)
 */
function buildTree(items: TrashItem[]): TrashTreeNode[] {
    const allIds = new Set(items.map((i) => i.id));
    const nodeMap = new Map<string, TrashTreeNode>();
    items.forEach((i) => nodeMap.set(i.id, { item: i, children: [] }));

    const roots: TrashTreeNode[] = [];
    items.forEach((i) => {
        const node = nodeMap.get(i.id)!;
        let parentId: string | null = null;

        if (i.type === 'folder') {
            parentId = i.parentId && allIds.has(i.parentId) ? i.parentId : null;
        } else {
            if (i.parentId && allIds.has(i.parentId)) {
                parentId = i.parentId;
            } else if (i.folderId && allIds.has(i.folderId)) {
                parentId = i.folderId;
            }
        }

        if (parentId) {
            nodeMap.get(parentId)!.children.push(node);
        } else {
            roots.push(node);
        }
    });

    // Папки перед заметками на каждом уровне
    const sortLevel = (nodes: TrashTreeNode[]) => {
        nodes.sort((a, b) => {
            if (a.item.type !== b.item.type) return a.item.type === 'folder' ? -1 : 1;
            return 0;
        });
        nodes.forEach((n) => sortLevel(n.children));
    };
    sortLevel(roots);
    return roots;
}

function findNodeInTree(nodes: TrashTreeNode[], id: string): TrashTreeNode | null {
    for (const node of nodes) {
        if (node.item.id === id) return node;
        const found = findNodeInTree(node.children, id);
        if (found) return found;
    }
    return null;
}

// ── Icons ─────────────────────────────────────────────────────────────────────

const ChevronRightIcon = ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="9 18 15 12 9 6" />
    </svg>
);

const FileIcon = ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
    </svg>
);

const FolderFilledIcon = ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
        <path d="M20 6h-8l-2-2H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2z" />
    </svg>
);

const XIcon = ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <line x1="18" y1="6" x2="6" y2="18" />
        <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
);

// ── ItemRow ───────────────────────────────────────────────────────────────────

interface ItemRowProps {
    item: TrashItem;
    isRoot?: boolean;
    descendantCount: number;
    hasChildren: boolean;
    isExpanded: boolean;
    onToggle: () => void;
    onRestore: (item: TrashItem) => void;
    onDelete: (item: TrashItem) => void;
}

const ItemRow: React.FC<ItemRowProps> = ({
    item, isRoot, descendantCount, hasChildren, isExpanded, onToggle, onRestore, onDelete,
}) => {
    const isFolder = item.type === 'folder';
    return (
        <div
            className={cn(
                styles.noteItem,
                isRoot && hasChildren && styles.noteItemRoot,
                !isRoot && styles.noteItemChild,
            )}
        >
            {/* Кнопка expand — всегда занимает место, чтобы иконка не прыгала */}
            <button
                className={cn(styles.expandBtn, hasChildren && styles.expandBtnVisible)}
                onClick={(e) => { e.stopPropagation(); if (hasChildren) onToggle(); }}
                tabIndex={hasChildren ? 0 : -1}
                aria-label={isExpanded ? 'Свернуть' : 'Развернуть'}
            >
                <ChevronRightIcon className={cn(styles.expandChevron, isExpanded && styles.expandChevronOpen)} />
            </button>

            {isFolder ? (
                <FolderFilledIcon className={cn(styles.noteIcon, styles.folderIcon)} />
            ) : (
                <FileIcon
                    className={cn(
                        styles.noteIcon,
                        isRoot && hasChildren && styles.noteIconAccent,
                    )}
                />
            )}

            <div className={styles.noteInfo}>
                <span className={styles.noteTitle}>{item.title || 'Untitled'}</span>
                <div className={styles.noteMeta}>
                    {!isExpanded && descendantCount > 0 && (
                        <span className={styles.childCountChip}>{descendantCount}</span>
                    )}
                    {item.deletedAt && <span>{formatDate(item.deletedAt)}</span>}
                </div>
            </div>

            <div className={styles.noteActions}>
                <button className={styles.actionButton} onClick={() => onRestore(item)} title="Восстановить">
                    <RestoreIcon className={styles.actionIcon} />
                    Восстановить
                </button>
                <button
                    className={cn(styles.actionButton, styles.actionButtonDanger)}
                    onClick={() => onDelete(item)}
                    title="Удалить навсегда"
                >
                    <XIcon className={styles.actionIcon} />
                </button>
            </div>
        </div>
    );
};

// ── Recursive tree renderer ───────────────────────────────────────────────────

function renderChildren(
    children: TrashTreeNode[],
    expandedIds: Set<string>,
    onToggle: (id: string) => void,
    onRestore: (item: TrashItem) => void,
    onDelete: (item: TrashItem) => void,
): React.ReactNode {
    return children.map((node) => {
        const expanded = expandedIds.has(node.item.id);
        return (
            <React.Fragment key={node.item.id}>
                <div className={styles.childCard}>
                    <ItemRow
                        item={node.item}
                        descendantCount={countDescendants(node)}
                        hasChildren={node.children.length > 0}
                        isExpanded={expanded}
                        onToggle={() => onToggle(node.item.id)}
                        onRestore={onRestore}
                        onDelete={onDelete}
                    />
                </div>
                {node.children.length > 0 && expanded && (
                    <div className={styles.childrenBlock}>
                        {renderChildren(node.children, expandedIds, onToggle, onRestore, onDelete)}
                    </div>
                )}
            </React.Fragment>
        );
    });
}

// ── TrashPage ─────────────────────────────────────────────────────────────────

interface RawNote { id: unknown; title?: string; parentId?: unknown; folderId?: unknown; deletedAt?: string | null; }
interface RawFolder { id: unknown; name?: string; parentId?: unknown; deletedAt?: string | null; }

export const TrashPage: React.FC = observer(() => {
    const sidebarStore = useSidebarStore();
    const { modalState, showModal, closeModal } = useModal();
    const [items, setItems] = useState<TrashItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
    const [isDragOver, setIsDragOver] = useState(false);

    const toggleExpanded = useCallback((id: string) => {
        setExpandedIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id); else next.add(id);
            return next;
        });
    }, []);

    const loadTrash = useCallback(async () => {
        try {
            const [notesRes, foldersRes] = await Promise.all([
                $api.get('/notes/trash'),
                $api.get('/folders/trash'),
            ]);

            const notes: TrashItem[] = (Array.isArray(notesRes.data) ? notesRes.data as RawNote[] : []).map(
                (n) => ({
                    id: String(n.id),
                    title: n.title || 'Untitled',
                    type: 'note' as const,
                    parentId: n.parentId ? String(n.parentId) : null,
                    folderId: n.folderId ? String(n.folderId) : null,
                    deletedAt: n.deletedAt ?? null,
                }),
            );

            const folders: TrashItem[] = (
                Array.isArray(foldersRes.data) ? foldersRes.data as RawFolder[] : []
            ).map((f) => ({
                id: String(f.id),
                title: f.name || 'Untitled',
                type: 'folder' as const,
                parentId: f.parentId ? String(f.parentId) : null,
                folderId: null,
                deletedAt: f.deletedAt ?? null,
            }));

            setItems([...folders, ...notes]);
        } catch (err) {
            console.error('Failed to load trash:', err);
        }
    }, []);

    const reloadSidebar = useCallback(async () => {
        try {
            const [foldersRes, notesRes] = await Promise.all([
                $api.get('/folders'),
                $api.get('/notes'),
            ]);
            sidebarStore.buildFileTree(
                Array.isArray(foldersRes.data) ? foldersRes.data : [],
                Array.isArray(notesRes.data) ? notesRes.data : [],
            );
        } catch (err) {
            console.error('Failed to reload sidebar:', err);
        }
    }, [sidebarStore]);

    // Первоначальная загрузка
    useEffect(() => {
        loadTrash().finally(() => setLoading(false));
    }, [loadTrash]);

    // Обновление при удалении элементов из сайдбара
    useEffect(() => {
        const handler = () => { void loadTrash(); };
        window.addEventListener('trash:updated', handler);
        return () => window.removeEventListener('trash:updated', handler);
    }, [loadTrash]);

    const groups = useMemo(() => buildTree(items), [items]);

    const restore = async (item: TrashItem) => {
        try {
            if (item.type === 'folder') {
                await $api.patch(`/folders/${item.id}/restore`);
            } else {
                await $api.patch(`/notes/${item.id}/restore`);
            }
            setItems((prev) => {
                const tree = buildTree(prev);
                const target = findNodeInTree(tree, item.id);
                if (!target) return prev.filter((i) => i.id !== item.id);
                const removedIds = new Set<string>();
                collectAllIds(target, removedIds);
                return prev.filter((i) => !removedIds.has(i.id));
            });
            await reloadSidebar();
        } catch (err) {
            console.error('Failed to restore:', err);
        }
    };

    const _doPermanentDelete = async (item: TrashItem) => {
        try {
            if (item.type === 'folder') {
                await $api.delete(`/folders/${item.id}/permanent`);
            } else {
                await $api.delete(`/notes/${item.id}/permanent`);
            }
            setItems((prev) => {
                const tree = buildTree(prev);
                const target = findNodeInTree(tree, item.id);
                if (!target) return prev.filter((i) => i.id !== item.id);
                const removedIds = new Set<string>();
                collectAllIds(target, removedIds);
                return prev.filter((i) => !removedIds.has(i.id));
            });
        } catch (err) {
            console.error('Failed to permanently delete:', err);
        }
    };

    const deletePermanently = (item: TrashItem) => {
        const tree = buildTree(items);
        const target = findNodeInTree(tree, item.id);
        const descendants = target ? countDescendants(target) : 0;
        const typeLabel = item.type === 'folder' ? 'Папка' : 'Заметка';
        const extra =
            descendants > 0
                ? ` Вместе с ней будет удалено ещё ${descendants} вложенных элементов.`
                : '';

        showModal(
            'Удалить навсегда',
            `${typeLabel} «${item.title}» будет удалена безвозвратно.${extra}`,
            () => _doPermanentDelete(item),
            { confirmText: 'Удалить', cancelText: 'Отмена', variant: 'danger' },
        );
    };

    const emptyTrash = () => {
        showModal(
            'Очистить корзину',
            `Все элементы корзины будут удалены навсегда. Это действие нельзя отменить.`,
            async () => {
                try {
                    // Удаляем только корневые элементы — бэкенд каскадно удаляет потомков
                    await Promise.all(
                        groups.map((n) =>
                            n.item.type === 'folder'
                                ? $api.delete(`/folders/${n.item.id}/permanent`)
                                : $api.delete(`/notes/${n.item.id}/permanent`),
                        ),
                    );
                    setItems([]);
                } catch (err) {
                    console.error('Failed to empty trash:', err);
                }
            },
            { confirmText: 'Очистить', cancelText: 'Отмена', variant: 'danger' },
        );
    };

    const handleDragEnter = useCallback((e: React.DragEvent) => {
        const node = sidebarStore.draggingNode;
        if (!node || node.isShared) return;
        e.preventDefault();
        setIsDragOver(true);
    }, [sidebarStore]);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        if ((e.currentTarget as Element).contains(e.relatedTarget as Node)) return;
        setIsDragOver(false);
    }, []);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        const node = sidebarStore.draggingNode;
        if (!node || node.isShared) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    }, [sidebarStore]);

    const handleDrop = useCallback(async (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);
        const dragging = sidebarStore.draggingNode;
        if (!dragging || dragging.isShared) return;
        sidebarStore.stopDragging();
        try {
            if (dragging.type === 'folder') {
                await $api.delete(`/folders/${dragging.id}`);
            } else {
                await $api.delete(`/notes/${dragging.id}`);
            }
            sidebarStore.deleteNode(dragging.id);
            void loadTrash();
        } catch (err) {
            console.error('Failed to move to trash:', err);
        }
    }, [sidebarStore, loadTrash]);

    return (
        <>
            <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
                <FileSidebar />
                <main
                    className={cn(
                        styles.trashPage,
                        !!sidebarStore.draggingNode && !sidebarStore.draggingNode.isShared && styles.trashPageDropTarget,
                    )}
                    onDragEnter={handleDragEnter}
                    onDragLeave={handleDragLeave}
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                >
                    {isDragOver && (
                        <div className={styles.dropOverlay}>
                            <TrashIcon className={styles.dropOverlayIcon} />
                            <span className={styles.dropOverlayText}>Перетащите сюда</span>
                        </div>
                    )}
                    <div className={styles.header}>
                        <div className={styles.headerLeft}>
                            <TrashIcon className={styles.headerIcon} />
                            <h1 className={styles.headerTitle}>Корзина</h1>
                            {items.length > 0 && (
                                <span className={styles.countBadge}>{items.length}</span>
                            )}
                        </div>
                        {items.length > 0 && (
                            <button className={styles.emptyTrashButton} onClick={emptyTrash}>
                                <TrashIcon className={styles.emptyTrashButtonIcon} />
                                Очистить корзину
                            </button>
                        )}
                    </div>

                    <div className={styles.content}>
                        {loading ? null : items.length === 0 ? (
                            <div className={styles.emptyState}>
                                <TrashIcon className={styles.emptyStateIcon} />
                                <p className={styles.emptyStateTitle}>Корзина пуста</p>
                                <p className={styles.emptyStateSubtitle}>
                                    Удалённые заметки и папки появятся здесь
                                </p>
                            </div>
                        ) : (
                            <>
                                <p className={styles.hint}>
                                    Заметки и папки в корзине будут удалены навсегда через 30 дней.
                                </p>
                                <div className={styles.list}>
                                    {groups.map((node, i) => {
                                        const expanded = expandedIds.has(node.item.id);
                                        return (
                                        <div
                                            key={node.item.id}
                                            className={styles.noteGroup}
                                            style={{ animationDelay: `${i * 35}ms` }}
                                        >
                                            <ItemRow
                                                item={node.item}
                                                isRoot
                                                descendantCount={countDescendants(node)}
                                                hasChildren={node.children.length > 0}
                                                isExpanded={expanded}
                                                onToggle={() => toggleExpanded(node.item.id)}
                                                onRestore={restore}
                                                onDelete={deletePermanently}
                                            />
                                            {node.children.length > 0 && expanded && (
                                                <div className={styles.childrenBlock}>
                                                    {renderChildren(
                                                        node.children,
                                                        expandedIds,
                                                        toggleExpanded,
                                                        restore,
                                                        deletePermanently,
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                        );
                                    })}
                                </div>
                            </>
                        )}
                    </div>
                </main>
            </div>
            {modalState && (
                <Modal
                    isOpen={modalState.isOpen}
                    onClose={closeModal}
                    title={modalState.title}
                    message={modalState.message}
                    confirmText={modalState.confirmText}
                    cancelText={modalState.cancelText}
                    onConfirm={modalState.onConfirm}
                    variant={modalState.variant}
                />
            )}
        </>
    );
});
