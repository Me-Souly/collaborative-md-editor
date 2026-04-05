import React, { useEffect, useRef, useState } from 'react';
import {
    Panel,
    PanelGroup,
    PanelResizeHandle,
    type ImperativePanelGroupHandle,
    type ImperativePanelHandle,
} from 'react-resizable-panels';
import { LinkIcon } from '@components/common/ui/icons';
import { MilkdownEditor } from '@components/notes/MilkdownEditor';
import { EditorTextarea } from '@components/notes/components/EditorTextarea';
import { EditorErrorBoundary } from '@components/ErrorBoundary';
import { type RemoteCursorState } from '@hooks/useAwareness';
import * as styles from '@components/notes/NoteViewer.module.css';

const cn = (...classes: (string | undefined | false)[]) => classes.filter(Boolean).join(' ');

type PreviewMode = 'split' | 'edit' | 'preview';

// Drag below this % → panel snaps to 0 (edge). Matches built-in collapsible snap.
const PANEL_MIN_SIZE = 8;

const LS_LAYOUT_KEY = 'editor:splitLayout';

function readSavedLayout(): [number, number] {
    try {
        const raw = localStorage.getItem(LS_LAYOUT_KEY);
        if (raw) {
            const parsed = JSON.parse(raw) as unknown;
            if (Array.isArray(parsed) && parsed.length === 2) {
                return parsed as [number, number];
            }
        }
    } catch {
        // ignore
    }
    return [50, 50];
}

interface NoteViewerContentProps {
    previewMode: PreviewMode;
    markdown: string;
    noteId: string;
    isLoading: boolean;
    textareaRef: React.RefObject<HTMLTextAreaElement | null>;
    previewScrollContainerRef: React.RefObject<HTMLDivElement | null>;
    previewContainerRef: React.RefObject<HTMLDivElement | null>;
    onMarkdownChange: (value: string) => void;
    onTextAreaKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
    onContentChange: (content: string, meta?: { origin?: 'milkdown' | 'sync' }) => void;
    getToken?: () => string | null;
    sharedConnection?: {
        doc: any;
        provider: any;
        text: any;
        fragment: any;
        awareness?: any;
    };
    initialMarkdown?: string;
    onUndo: () => void;
    onRedo: () => void;
    onPreviewModeChange: (mode: PreviewMode) => void;
    syncScroll: boolean;
    onToggleSyncScroll: () => void;
    remoteCursors?: RemoteCursorState[];
    broadcastCursor?: (anchor: number, head: number) => void;
    clearCursor?: () => void;
    isMobile?: boolean;
}

export const NoteViewerContent: React.FC<NoteViewerContentProps> = ({
    previewMode,
    markdown,
    noteId,
    isLoading,
    textareaRef,
    previewScrollContainerRef,
    previewContainerRef,
    onMarkdownChange,
    onTextAreaKeyDown,
    onContentChange,
    getToken,
    sharedConnection,
    initialMarkdown,
    onUndo,
    onRedo,
    onPreviewModeChange,
    syncScroll,
    onToggleSyncScroll,
    remoteCursors,
    broadcastCursor,
    clearCursor,
    isMobile,
}) => {
    const panelGroupRef = useRef<ImperativePanelGroupHandle>(null);
    const leftPanelRef = useRef<ImperativePanelHandle>(null);
    const rightPanelRef = useRef<ImperativePanelHandle>(null);
    // Guard: true while we programmatically change layout. Prevents collapse/expand
    // callbacks from mis-interpreting our changes as user drags.
    const isProgrammaticRef = useRef(false);
    // Initial split layout read from localStorage once on mount.
    const [initialLayout] = useState<[number, number]>(readSavedLayout);

    // When switching back to split from preview/edit, restore saved layout.
    useEffect(() => {
        if (previewMode !== 'split') return;
        isProgrammaticRef.current = true;
        panelGroupRef.current?.setLayout(readSavedLayout());
        const timer = setTimeout(() => { isProgrammaticRef.current = false; }, 400);
        return () => clearTimeout(timer);
    }, [previewMode]);

    const handleLeftCollapse  = () => { if (!isProgrammaticRef.current) onPreviewModeChange('edit'); };
    const handleRightCollapse = () => { if (!isProgrammaticRef.current) onPreviewModeChange('preview'); };
    const handleLeftExpand    = () => { if (!isProgrammaticRef.current) onPreviewModeChange('split'); };
    const handleRightExpand   = () => { if (!isProgrammaticRef.current) onPreviewModeChange('split'); };

    // Non-split modes: render only the active pane — no PanelGroup at all.
    // This avoids react-resizable-panels issues with defaultSize=0 vs minSize
    // and works identically on mobile and desktop.
    if (previewMode === 'preview') {
        return (
            <div ref={previewContainerRef} className={styles.rightPane} style={{ width: '100%', height: '100%' }}>
                <div ref={previewScrollContainerRef} className={styles.previewScroll}>
                    <EditorErrorBoundary>
                        <MilkdownEditor
                            key={`preview-${noteId}`}
                            noteId={noteId}
                            readOnly={false}
                            onContentChange={onContentChange}
                            getToken={getToken}
                            sharedConnection={sharedConnection || undefined}
                            expectSharedConnection={true}
                            onUndo={onUndo}
                            onRedo={onRedo}
                            initialMarkdown={initialMarkdown}
                            hideLoadingIndicator={true}
                        />
                    </EditorErrorBoundary>
                </div>
            </div>
        );
    }

    if (previewMode === 'edit') {
        return (
            <EditorTextarea
                ref={textareaRef}
                value={markdown}
                onChange={onMarkdownChange}
                onKeyDown={onTextAreaKeyDown}
                isLoading={isLoading}
                remoteCursors={remoteCursors}
                broadcastCursor={broadcastCursor}
                clearCursor={clearCursor}
            />
        );
    }

    // Split mode — PanelGroup with resizable handle
    return (
        <PanelGroup
            direction="horizontal"
            className={styles.panelGroup}
            ref={panelGroupRef}
        >
            {/* Left pane — rendered preview (Milkdown) */}
            <Panel
                ref={leftPanelRef}
                defaultSize={initialLayout[0]}
                minSize={PANEL_MIN_SIZE}
                collapsible
                collapsedSize={0}
                onCollapse={handleLeftCollapse}
                onExpand={handleLeftExpand}
            >
                <div
                    ref={previewContainerRef}
                    className={cn(
                        styles.rightPane,
                        styles.noScrollbarPane,
                    )}
                >
                    <div ref={previewScrollContainerRef} className={styles.previewScroll}>
                        <EditorErrorBoundary>
                            <MilkdownEditor
                                key={`preview-${noteId}`}
                                noteId={noteId}
                                readOnly={false}
                                onContentChange={onContentChange}
                                getToken={getToken}
                                sharedConnection={sharedConnection || undefined}
                                expectSharedConnection={true}
                                onUndo={onUndo}
                                onRedo={onRedo}
                                initialMarkdown={initialMarkdown}
                                hideLoadingIndicator={true}
                            />
                        </EditorErrorBoundary>
                    </div>
                </div>
            </Panel>
            <PanelResizeHandle
                className={styles.resizeHandle}
                onDragging={(isDragging) => {
                    // Save layout when user stops dragging — no debounce needed
                    if (!isDragging) {
                        const layout = panelGroupRef.current?.getLayout();
                        if (layout && layout[0] > 5 && layout[1] > 5) {
                            localStorage.setItem(LS_LAYOUT_KEY, JSON.stringify(layout));
                        }
                    }
                }}
            >
                <button
                    className={cn(
                        styles.syncScrollBtn,
                        syncScroll && styles.syncScrollBtnActive,
                    )}
                    style={{ cursor: 'pointer' }}
                    onClick={(e) => {
                        e.stopPropagation();
                        onToggleSyncScroll();
                    }}
                    title={syncScroll ? 'Scroll sync on — click to disable' : 'Scroll sync off — click to enable'}
                >
                    <LinkIcon className={styles.syncScrollIcon} />
                </button>
            </PanelResizeHandle>
            {/* Right pane — raw markdown textarea */}
            <Panel
                ref={rightPanelRef}
                defaultSize={initialLayout[1]}
                minSize={PANEL_MIN_SIZE}
                collapsible
                collapsedSize={0}
                onCollapse={handleRightCollapse}
                onExpand={handleRightExpand}
            >
                <EditorTextarea
                    ref={textareaRef}
                    value={markdown}
                    onChange={onMarkdownChange}
                    onKeyDown={onTextAreaKeyDown}
                    isLoading={isLoading}
                    remoteCursors={remoteCursors}
                    broadcastCursor={broadcastCursor}
                    clearCursor={clearCursor}
                />
            </Panel>
        </PanelGroup>
    );
};
