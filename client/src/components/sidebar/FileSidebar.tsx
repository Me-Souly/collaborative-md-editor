import React, { useEffect, useRef, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { runInAction } from 'mobx';
import { useNavigate, useLocation } from 'react-router-dom';
import { useSidebarStore } from '@hooks/useStores';
import { FileSidebarHeader } from '@components/sidebar/FileSidebar/FileSidebarHeader';
import { QuickActions } from '@components/sidebar/FileSidebar/QuickActions';
import { SearchBar } from '@components/sidebar/FileSidebar/SearchBar';
import { FileTree } from '@components/sidebar/FileSidebar/FileTree';
import { FileSidebarFooter } from '@components/sidebar/FileSidebar/FileSidebarFooter';
import { TrashIcon, PinIcon } from '@components/common/ui/icons';
import { FileTreeNode } from '@app-types/notes';
import $api from '@http';
import * as styles from '@components/sidebar/FileSidebar.module.css';

const cn = (...classes: (string | undefined | false)[]) => classes.filter(Boolean).join(' ');

const MIN_WIDTH = 160;
const MAX_WIDTH = 480;
const DEFAULT_WIDTH = 260;

function getSavedWidth(): number {
    try {
        const v = localStorage.getItem('sidebarWidth');
        if (v) {
            const n = parseInt(v, 10);
            if (n >= MIN_WIDTH && n <= MAX_WIDTH) return n;
        }
    } catch {
        /* ignore */
    }
    return DEFAULT_WIDTH;
}

interface FileSidebarProps {
    currentNoteId?: string;
}

export const FileSidebar: React.FC<FileSidebarProps> = observer(({ currentNoteId }) => {
    const sidebarStore = useSidebarStore();
    const navigate = useNavigate();
    const location = useLocation();
    const [sidebarWidth, setSidebarWidth] = useState(getSavedWidth);
    const isResizingRef = useRef(false);
    const [isResizing, setIsResizing] = useState(false);

    // Sync CSS variable on mount and whenever width changes
    useEffect(() => {
        document.documentElement.style.setProperty('--sidebar-width', sidebarWidth + 'px');
    }, [sidebarWidth]);

    useEffect(() => {
        if (currentNoteId) {
            sidebarStore.setSelectedNoteId(currentNoteId);
        }
    }, [currentNoteId, sidebarStore]);

    const loadSharedNotes = async () => {
        try {
            const sharedRes = await $api.get('/notes/shared');
            const raw: any[] = Array.isArray(sharedRes.data) ? sharedRes.data : [];

            // Build tree from flat list using parentId
            const nodeMap = new Map<string, FileTreeNode>();
            raw.forEach((note: any) => {
                nodeMap.set(note.id, {
                    id: note.id,
                    name: note.title || 'Untitled',
                    type: 'file' as const,
                    isShared: true,
                    children: [],
                });
            });

            const roots: FileTreeNode[] = [];
            raw.forEach((note: any) => {
                const node = nodeMap.get(note.id)!;
                if (note.parentId && nodeMap.has(note.parentId)) {
                    const parent = nodeMap.get(note.parentId)!;
                    if (!parent.children) parent.children = [];
                    parent.children.push(node);
                } else {
                    roots.push(node);
                }
            });

            runInAction(() => {
                sidebarStore.sharedNotes = roots;
            });
        } catch (err) {
            console.error('Failed to load shared notes:', err);
        }
    };

    useEffect(() => {
        const loadInitialData = async () => {
            try {
                const requests: Promise<any>[] = [loadSharedNotes()];
                if (sidebarStore.fileTree.length === 0) {
                    requests.push(
                        $api.get('/folders').then(foldersRes =>
                            $api.get('/notes').then(notesRes => {
                                runInAction(() => {
                                    sidebarStore.buildFileTree(
                                        Array.isArray(foldersRes.data) ? foldersRes.data : [],
                                        Array.isArray(notesRes.data) ? notesRes.data : [],
                                    );
                                });
                            })
                        )
                    );
                }
                await Promise.all(requests);
            } catch (err) {
                console.error('Failed to load sidebar data:', err);
            }
        };

        void loadInitialData();
    }, [sidebarStore]); // eslint-disable-line react-hooks/exhaustive-deps

    // Live reload shared notes when notified via SSE
    useEffect(() => {
        if (!sidebarStore.sharedNotesReloadToken) return;
        void loadSharedNotes();
    }, [sidebarStore.sharedNotesReloadToken]); // eslint-disable-line react-hooks/exhaustive-deps

    const handleSelectNote = (id: string) => {
        sidebarStore.setSelectedNoteId(id);
        navigate(`/note/${id}`);
    };

    const handleResizeStart = (e: React.MouseEvent) => {
        e.preventDefault();
        isResizingRef.current = true;
        setIsResizing(true);

        const startX = e.clientX;
        const startWidth = sidebarWidth;

        document.body.style.userSelect = 'none';
        document.body.style.cursor = 'col-resize';

        const handleMouseMove = (e: MouseEvent) => {
            if (!isResizingRef.current) return;
            const newWidth = Math.max(
                MIN_WIDTH,
                Math.min(MAX_WIDTH, startWidth + e.clientX - startX),
            );
            setSidebarWidth(newWidth);
            document.documentElement.style.setProperty('--sidebar-width', newWidth + 'px');
        };

        const handleMouseUp = (e: MouseEvent) => {
            isResizingRef.current = false;
            setIsResizing(false);
            document.body.style.userSelect = '';
            document.body.style.cursor = '';
            const finalWidth = Math.max(
                MIN_WIDTH,
                Math.min(MAX_WIDTH, startWidth + e.clientX - startX),
            );
            localStorage.setItem('sidebarWidth', String(finalWidth));
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    };

    return (
        <aside
            className={cn(
                styles.sidebar,
                sidebarStore.collapsed ? styles.sidebarCollapsed : styles.sidebarExpanded,
                isResizing && styles.sidebarResizing,
            )}
            style={!sidebarStore.collapsed ? { width: sidebarWidth } : undefined}
        >
            <FileSidebarHeader />
            <QuickActions />
            <SearchBar />

            {sidebarStore.pinnedNotes.length > 0 && (
                <div className={styles.pinnedSection}>
                    <div className={styles.pinnedSectionHeader}>Pinned</div>
                    {sidebarStore.pinnedNotes.map((node) => (
                        <button
                            key={node.id}
                            className={cn(
                                styles.button,
                                styles.buttonGhost,
                                styles.pinnedItem,
                                sidebarStore.selectedNoteId === node.id && styles.treeNodeSelected,
                            )}
                            onClick={() => handleSelectNote(node.id)}
                            title={node.name}
                        >
                            <PinIcon className={styles.pinnedItemPinIcon} />
                            <span className={styles.pinnedItemName}>{node.name}</span>
                        </button>
                    ))}
                </div>
            )}

            {sidebarStore.allTags.length > 0 && (
                <div className={styles.tagsSection}>
                    <div className={styles.tagsSectionHeader}>Tags</div>
                    <div className={styles.tagsPills}>
                        {sidebarStore.allTags.map((tag) => (
                            <button
                                key={tag}
                                className={cn(
                                    styles.tagPill,
                                    sidebarStore.activeTagFilter === tag && styles.tagPillActive,
                                )}
                                onClick={() => sidebarStore.setActiveTagFilter(tag)}
                            >
                                #{tag}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            <FileTree currentNoteId={currentNoteId} onSelectNote={handleSelectNote} />

            {/* Quick links: Trash */}
            <div className={styles.quickLinks}>
                <button
                    className={cn(
                        styles.button,
                        styles.buttonGhost,
                        styles.quickLinksItem,
                        location.pathname === '/trash' && styles.quickLinksItemActive,
                    )}
                    onClick={() => location.pathname === '/trash' ? navigate(-1) : navigate('/trash')}
                    title="Trash"
                >
                    <TrashIcon className={cn(styles.iconSmall, styles.iconMuted)} />
                    <span>Trash</span>
                </button>
            </div>

            <FileSidebarFooter />

            {!sidebarStore.collapsed && (
                <div
                    className={cn(styles.resizeHandle, isResizing && styles.resizeHandleActive)}
                    onMouseDown={handleResizeStart}
                />
            )}
        </aside>
    );
});
