import React from 'react';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { MilkdownEditor } from '@components/notes/MilkdownEditor';
import { EditorTextarea } from '@components/notes/components/EditorTextarea';
import { EditorErrorBoundary } from '@components/ErrorBoundary';
import * as styles from '@components/notes/NoteViewer.module.css';

const cn = (...classes: (string | undefined | false)[]) => classes.filter(Boolean).join(' ');

type PreviewMode = 'split' | 'edit' | 'preview';

interface NoteViewerContentProps {
    previewMode: PreviewMode;
    markdown: string;
    noteId: string;
    isLoading: boolean;
    textareaRef: React.RefObject<HTMLTextAreaElement>;
    previewScrollContainerRef: React.RefObject<HTMLDivElement>;
    previewContainerRef: React.RefObject<HTMLDivElement>;
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
}) => {
    if (previewMode === 'split') {
        return (
            <PanelGroup direction="horizontal" className={styles.panelGroup}>
                <Panel defaultSize={50} minSize={20}>
                    <EditorTextarea
                        ref={textareaRef}
                        value={markdown}
                        onChange={onMarkdownChange}
                        onKeyDown={onTextAreaKeyDown}
                        isLoading={isLoading}
                    />
                </Panel>
                <PanelResizeHandle className={styles.resizeHandle} />
                <Panel defaultSize={50} minSize={20}>
                    <div className={styles.rightPane}>
                        <div ref={previewScrollContainerRef} className={styles.previewScroll}>
                            <EditorErrorBoundary>
                                <MilkdownEditor
                                    key={`preview-${noteId}`}
                                    noteId={noteId}
                                    readOnly={false}
                                    // Даем редактировать в превью, но оно пишет прямо в Y.Text как отдельный локальный источник
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
            </PanelGroup>
        );
    }

    return (
        <div className={styles.singleModeContainer}>
            <div
                ref={previewContainerRef}
                className={cn(
                    styles.previewScroll,
                    previewMode === 'edit' && styles.previewHidden,
                    previewMode === 'preview' && styles.previewFull,
                )}
            >
                <EditorErrorBoundary>
                    <MilkdownEditor
                        key={`preview-${noteId}`}
                        noteId={noteId}
                        readOnly={false}
                        // Даем редактировать в превью, пишем прямо в Y.Text как отдельный локальный источник
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
            {previewMode === 'edit' && (
                <EditorTextarea
                    ref={textareaRef}
                    value={markdown}
                    onChange={onMarkdownChange}
                    onKeyDown={onTextAreaKeyDown}
                    isLoading={isLoading}
                />
            )}
        </div>
    );
};
