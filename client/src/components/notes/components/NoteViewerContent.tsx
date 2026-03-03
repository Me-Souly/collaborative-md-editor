import React, { useEffect, useRef } from 'react';
import {
    Panel,
    PanelGroup,
    PanelResizeHandle,
    type ImperativePanelGroupHandle,
    type ImperativePanelHandle,
} from 'react-resizable-panels';
import { MilkdownEditor } from '@components/notes/MilkdownEditor';
import { EditorTextarea } from '@components/notes/components/EditorTextarea';
import { EditorErrorBoundary } from '@components/ErrorBoundary';
import * as styles from '@components/notes/NoteViewer.module.css';

const cn = (...classes: (string | undefined | false)[]) => classes.filter(Boolean).join(' ');

type PreviewMode = 'split' | 'edit' | 'preview';

// Drag below this % → panel snaps to 0 (edge). Matches built-in collapsible snap.
const PANEL_MIN_SIZE = 8;

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
    };
    initialMarkdown?: string;
    onUndo: () => void;
    onRedo: () => void;
    onPreviewModeChange: (mode: PreviewMode) => void;
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
}) => {
    const panelGroupRef = useRef<ImperativePanelGroupHandle>(null);
    const leftPanelRef = useRef<ImperativePanelHandle>(null);
    const rightPanelRef = useRef<ImperativePanelHandle>(null);
    // Suppress onCollapse/onExpand callbacks while we're updating layout programmatically
    const isProgrammaticRef = useRef(false);

    // Sync panel layout when previewMode changes via toolbar buttons
    useEffect(() => {
        isProgrammaticRef.current = true;
        if (previewMode === 'split') {
            panelGroupRef.current?.setLayout([50, 50]);
        } else if (previewMode === 'edit') {
            leftPanelRef.current?.collapse();
        } else {
            rightPanelRef.current?.collapse();
        }
        const timer = setTimeout(() => {
            isProgrammaticRef.current = false;
        }, 150);
        return () => clearTimeout(timer);
    }, [previewMode]);

    const handleLeftCollapse = () => {
        if (!isProgrammaticRef.current) onPreviewModeChange('edit');
    };
    const handleLeftExpand = () => {
        if (!isProgrammaticRef.current) onPreviewModeChange('split');
    };
    const handleRightCollapse = () => {
        if (!isProgrammaticRef.current) onPreviewModeChange('preview');
    };
    const handleRightExpand = () => {
        if (!isProgrammaticRef.current) onPreviewModeChange('split');
    };

    return (
        <PanelGroup
            direction="horizontal"
            className={styles.panelGroup}
            ref={panelGroupRef}
        >
            {/* Left pane — rendered preview (Milkdown) */}
            <Panel
                ref={leftPanelRef}
                defaultSize={50}
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
                        previewMode === 'split' && styles.noScrollbarPane,
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
                                expectSharedConnection={false}
                                onUndo={onUndo}
                                onRedo={onRedo}
                                initialMarkdown={initialMarkdown}
                                hideLoadingIndicator={true}
                            />
                        </EditorErrorBoundary>
                    </div>
                </div>
            </Panel>
            <PanelResizeHandle className={styles.resizeHandle} />
            {/* Right pane — raw markdown textarea */}
            <Panel
                ref={rightPanelRef}
                defaultSize={50}
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
                />
            </Panel>
        </PanelGroup>
    );
};
