import React, { useEffect, useRef, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { runInAction } from 'mobx';
import { useNavigate } from 'react-router-dom';
import { useSidebarStore } from '@hooks/useStores';
import { FileSidebarHeader } from '@components/sidebar/FileSidebar/FileSidebarHeader';
import { QuickActions } from '@components/sidebar/FileSidebar/QuickActions';
import { SearchBar } from '@components/sidebar/FileSidebar/SearchBar';
import { FileTree } from '@components/sidebar/FileSidebar/FileTree';
import { FileSidebarFooter } from '@components/sidebar/FileSidebar/FileSidebarFooter';
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
    } catch { /* ignore */ }
    return DEFAULT_WIDTH;
}

interface FileSidebarProps {
    currentNoteId?: string;
}

export const FileSidebar: React.FC<FileSidebarProps> = observer(({ currentNoteId }) => {
    const sidebarStore = useSidebarStore();
    const navigate = useNavigate();
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

    useEffect(() => {
        const loadSharedNotes = async () => {
            try {
                const res = await $api.get('/notes/shared');
                const sharedData = Array.isArray(res.data) ? res.data : [];
                const sharedNodes: FileTreeNode[] = sharedData.map((note: any) => ({
                    id: note.id,
                    name: note.title || 'Untitled',
                    type: 'file' as const,
                }));

                runInAction(() => {
                    sidebarStore.sharedNotes = sharedNodes;
                });
            } catch (err) {
                console.error('Failed to load shared notes:', err);
            }
        };

        loadSharedNotes();
    }, []);

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
            const newWidth = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, startWidth + e.clientX - startX));
            setSidebarWidth(newWidth);
            document.documentElement.style.setProperty('--sidebar-width', newWidth + 'px');
        };

        const handleMouseUp = (e: MouseEvent) => {
            isResizingRef.current = false;
            setIsResizing(false);
            document.body.style.userSelect = '';
            document.body.style.cursor = '';
            const finalWidth = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, startWidth + e.clientX - startX));
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
            <FileTree currentNoteId={currentNoteId} onSelectNote={handleSelectNote} />
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
