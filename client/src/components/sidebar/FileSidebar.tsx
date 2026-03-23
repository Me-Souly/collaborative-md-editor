import React, { useCallback, useEffect, useRef, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { runInAction } from 'mobx';
import { useNavigate, useLocation } from 'react-router-dom';
import { useSidebarStore } from '@hooks/useStores';
import { useIsMobile } from '@hooks/useMediaQuery';
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

// Bottom sheet snap points (vh)
const SNAP_COLLAPSED = 0;
const SNAP_HALF = 50;
const SNAP_FULL = 90;

function snapTo(currentVh: number): number {
    const mid1 = (SNAP_COLLAPSED + SNAP_HALF) / 2;
    const mid2 = (SNAP_HALF + SNAP_FULL) / 2;
    if (currentVh < mid1) return SNAP_COLLAPSED;
    if (currentVh < mid2) return SNAP_HALF;
    return SNAP_FULL;
}

export const FileSidebar: React.FC<FileSidebarProps> = observer(({ currentNoteId }) => {
    const sidebarStore = useSidebarStore();
    const navigate = useNavigate();
    const location = useLocation();
    const isMobile = useIsMobile();
    const [sidebarWidth, setSidebarWidth] = useState(getSavedWidth);
    const isResizingRef = useRef(false);
    const [isResizing, setIsResizing] = useState(false);

    // Bottom sheet state (mobile only)
    const [sheetHeight, setSheetHeight] = useState(SNAP_COLLAPSED); // in vh
    const [isDraggingSheet, setIsDraggingSheet] = useState(false);
    const dragStartRef = useRef({ y: 0, height: 0 });

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

    // Sync bottom sheet with collapsed state (mobile)
    useEffect(() => {
        if (!isMobile) return;
        if (sidebarStore.collapsed && sheetHeight !== SNAP_COLLAPSED) {
            setSheetHeight(SNAP_COLLAPSED);
        } else if (!sidebarStore.collapsed && sheetHeight === SNAP_COLLAPSED) {
            setSheetHeight(SNAP_FULL);
        }
    }, [sidebarStore.collapsed, isMobile]); // eslint-disable-line react-hooks/exhaustive-deps

    // Close bottom sheet when height reaches 0
    useEffect(() => {
        if (!isMobile) return;
        if (sheetHeight === SNAP_COLLAPSED && !sidebarStore.collapsed) {
            sidebarStore.toggleCollapse();
        }
    }, [sheetHeight, isMobile]); // eslint-disable-line react-hooks/exhaustive-deps

    const handleSheetTouchStart = useCallback((e: React.TouchEvent) => {
        setIsDraggingSheet(true);
        dragStartRef.current = {
            y: e.touches[0].clientY,
            height: sheetHeight,
        };
    }, [sheetHeight]);

    const handleSheetTouchMove = useCallback((e: React.TouchEvent) => {
        if (!isDraggingSheet) return;
        const deltaY = dragStartRef.current.y - e.touches[0].clientY;
        const deltaVh = (deltaY / window.innerHeight) * 100;
        const newHeight = Math.max(0, Math.min(SNAP_FULL, dragStartRef.current.height + deltaVh));
        setSheetHeight(newHeight);
    }, [isDraggingSheet]);

    const handleSheetTouchEnd = useCallback(() => {
        setIsDraggingSheet(false);
        const snapped = snapTo(sheetHeight);
        setSheetHeight(snapped);
        if (snapped === SNAP_COLLAPSED && !sidebarStore.collapsed) {
            sidebarStore.toggleCollapse();
        }
    }, [sheetHeight, sidebarStore]);

    // Public toggle for hamburger button
    const toggleSheet = useCallback(() => {
        if (sheetHeight > 0) {
            setSheetHeight(SNAP_COLLAPSED);
            if (!sidebarStore.collapsed) sidebarStore.toggleCollapse();
        } else {
            setSheetHeight(SNAP_FULL);
            if (sidebarStore.collapsed) sidebarStore.toggleCollapse();
        }
    }, [sheetHeight, sidebarStore]);

    const handleSelectNote = (id: string) => {
        sidebarStore.setSelectedNoteId(id);
        navigate(`/note/${id}`);
        // Auto-close bottom sheet on mobile
        if (isMobile) {
            setSheetHeight(SNAP_COLLAPSED);
            if (!sidebarStore.collapsed) sidebarStore.toggleCollapse();
        }
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

    const sidebarContent = (
        <>
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
                    onClick={() => {
                        if (isMobile) {
                            setSheetHeight(SNAP_COLLAPSED);
                            if (!sidebarStore.collapsed) sidebarStore.toggleCollapse();
                        }
                        location.pathname === '/trash' ? navigate(-1) : navigate('/trash');
                    }}
                    title="Trash"
                >
                    <TrashIcon className={cn(styles.iconSmall, styles.iconMuted)} />
                    <span>Trash</span>
                </button>
            </div>

            <FileSidebarFooter />
        </>
    );

    // Mobile: bottom sheet
    if (isMobile) {
        const isOpen = sheetHeight > 0;
        return (
            <>
                {isOpen && (
                    <div
                        className={styles.sheetBackdrop}
                        onClick={toggleSheet}
                    />
                )}
                <aside
                    className={cn(styles.sidebar, styles.sidebarSheet)}
                    style={{
                        height: `${sheetHeight}vh`,
                        transition: isDraggingSheet ? 'none' : 'height 0.3s ease',
                    }}
                >
                    {/* Drag handle */}
                    <div
                        className={styles.dragHandle}
                        onTouchStart={handleSheetTouchStart}
                        onTouchMove={handleSheetTouchMove}
                        onTouchEnd={handleSheetTouchEnd}
                    >
                        <div className={styles.dragHandleBar} />
                    </div>
                    {sidebarContent}
                </aside>
            </>
        );
    }

    // Desktop: standard sidebar
    return (
        <aside
            className={cn(
                styles.sidebar,
                sidebarStore.collapsed ? styles.sidebarCollapsed : styles.sidebarExpanded,
                isResizing && styles.sidebarResizing,
            )}
            style={!sidebarStore.collapsed ? { width: sidebarWidth } : undefined}
        >
            {sidebarContent}
            {!sidebarStore.collapsed && (
                <div
                    className={cn(styles.resizeHandle, isResizing && styles.resizeHandleActive)}
                    onMouseDown={handleResizeStart}
                />
            )}
        </aside>
    );
});
