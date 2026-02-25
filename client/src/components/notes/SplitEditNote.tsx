import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNoteYDoc } from '@hooks/useNoteYDoc';
import { useConnectionStatus } from '@hooks/useConnectionStatus';
import { useEditorHistory } from '@components/notes/hooks/useEditorHistory';
import { useScrollSync } from '@components/notes/hooks/useScrollSync';
import { useUndoRedo } from '@components/notes/hooks/useUndoRedo';
import { EditorToolbar } from '@components/notes/components/EditorToolbar';
import { EditorBottomBar } from '@components/notes/components/EditorBottomBar';
import { NoteViewerContent } from '@components/notes/components/NoteViewerContent';
import * as styles from '@components/notes/NoteViewer.module.css';

const cx = (...classes: (string | undefined | false)[]) => classes.filter(Boolean).join(' ');

type PreviewMode = 'split' | 'edit' | 'preview';

interface SplitEditNoteProps {
    noteId: string;
    getToken?: () => string | null;
    className?: string;
    initialMarkdown?: string;
    ownerId?: string;
    isPublic?: boolean;
}

export const SplitEditNote: React.FC<SplitEditNoteProps> = ({
    noteId,
    getToken,
    className,
    initialMarkdown,
    ownerId,
    isPublic = false,
}) => {
    const _navigate = useNavigate();
    const { markdown, setMarkdown, isLoading, sharedConnection, applyContentToYjs } = useNoteYDoc({
        noteId,
        getToken,
        enabled: true,
        initialMarkdown,
    });

    const [previewMode, setPreviewMode] = useState<PreviewMode>('split');
    const [wordCount, setWordCount] = useState(0);
    const [ownerInfo, _setOwnerInfo] = useState<{ login?: string; name?: string } | null>(null);
    const [showLoader, setShowLoader] = useState(true);

    const connStatus = useConnectionStatus(sharedConnection?.provider ?? null);

    const previewContainerRef = useRef<HTMLDivElement | null>(null);
    const textareaRef = useRef<HTMLTextAreaElement | null>(null);
    const previewScrollContainerRef = useRef<HTMLDivElement | null>(null);

    const {
        history,
        redoStack,
        initializeHistory,
        scheduleHistoryPush,
        updateMarkdownRef,
        setHistory,
        setRedoStack,
        flushHistoryDebounce,
    } = useEditorHistory(initialMarkdown);

    const { savedTextareaScrollRef } = useScrollSync(
        textareaRef,
        previewScrollContainerRef,
        previewMode,
        markdown,
        isLoading,
    );

    const {
        handleUndo,
        handleRedo,
        isUndoRedoInProgressRef: _isUndoRedoInProgressRef,
    } = useUndoRedo({
        history,
        redoStack,
        setHistory,
        setRedoStack,
        setMarkdown,
        applyContentToYjs,
        flushHistoryDebounce,
    });

    // Минимальное время показа прелоудера (800ms) чтобы он не мелькал
    useEffect(() => {
        if (isLoading) {
            setShowLoader(true);
        } else {
            const timer = setTimeout(() => {
                setShowLoader(false);
            }, 800);
            return () => clearTimeout(timer);
        }
    }, [isLoading]);

    // Подсчет слов
    useEffect(() => {
        const words = markdown.trim().split(/\s+/).filter(Boolean).length;
        setWordCount(words);
    }, [markdown]);

    // Синхронизируем ref с актуальным markdown
    useEffect(() => {
        updateMarkdownRef(markdown);
    }, [markdown, updateMarkdownRef]);

    // Инициализация истории после первой загрузки markdown из Yjs
    useEffect(() => {
        if (!isLoading && markdown) {
            initializeHistory(markdown);
        }
    }, [markdown, isLoading, initializeHistory]);

    // Принудительный ресинк удалён, чтобы не триггерить лишние транзакции и эхо

    const handleMarkdownChange = (newContent: string) => {
        if (newContent === markdown) return;

        const textarea = textareaRef.current;
        if (textarea && document.activeElement === textarea) {
            savedTextareaScrollRef.current = textarea.scrollTop;
        }

        setMarkdown(newContent);
        applyContentToYjs(newContent);
        scheduleHistoryPush(newContent, true);

        if (textarea && document.activeElement === textarea) {
            requestAnimationFrame(() => {
                if (textarea && document.activeElement === textarea) {
                    textarea.scrollTop = savedTextareaScrollRef.current;
                }
            });
        }
    };

    const handleTextAreaKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (event.ctrlKey && !event.shiftKey && event.key.toLowerCase() === 'z') {
            event.preventDefault();
            handleUndo();
            return;
        }
        if (
            (event.ctrlKey && event.key.toLowerCase() === 'y') ||
            (event.ctrlKey && event.shiftKey && event.key.toLowerCase() === 'z')
        ) {
            event.preventDefault();
            handleRedo();
        }
    };

    // Глобальное управление undo/redo
    useEffect(() => {
        const handler = (event: KeyboardEvent) => {
            const isMod = event.ctrlKey || event.metaKey;
            if (!isMod) return;

            const code = event.code?.toLowerCase();
            const _key = event.key.toLowerCase();
            const isUndoKey = code === 'keyz';
            const isRedoKey = code === 'keyy';
            if (!isUndoKey && !isRedoKey) return;

            const active = document.activeElement;
            const target = event.target as Node | null;

            const previewRoot = previewContainerRef.current;
            const inPreview =
                previewRoot &&
                ((active instanceof Node && previewRoot.contains(active)) ||
                    (target && previewRoot.contains(target)));

            const inTextarea = active instanceof HTMLTextAreaElement;

            if (!inPreview && !inTextarea) return;

            if (isUndoKey && !event.shiftKey) {
                event.preventDefault();
                event.stopPropagation();
                handleUndo();
                return;
            }

            if (isRedoKey || (isUndoKey && event.shiftKey)) {
                event.preventDefault();
                event.stopPropagation();
                handleRedo();
            }
        };

        window.addEventListener('keydown', handler, true);
        return () => {
            window.removeEventListener('keydown', handler, true);
        };
    }, [handleUndo, handleRedo]);

    // Дополнительный обработчик на preview контейнере
    useEffect(() => {
        const container = previewContainerRef.current;
        if (!container) return;

        const handler = (event: KeyboardEvent) => {
            const isMod = event.ctrlKey || event.metaKey;
            if (!isMod) return;

            const code = event.code?.toLowerCase();
            const isUndoKey = code === 'keyz';
            const isRedoKey = code === 'keyy';
            if (!isUndoKey && !isRedoKey) return;

            if (isUndoKey && !event.shiftKey) {
                event.preventDefault();
                event.stopPropagation();
                event.stopImmediatePropagation?.();
                handleUndo();
                return;
            }

            if (isRedoKey || (isUndoKey && event.shiftKey)) {
                event.preventDefault();
                event.stopPropagation();
                event.stopImmediatePropagation?.();
                handleRedo();
            }
        };

        container.addEventListener('keydown', handler, true);
        return () => {
            container.removeEventListener('keydown', handler, true);
        };
    }, [handleUndo, handleRedo]);

    const handleContentChange = (content: string, meta?: { origin?: 'milkdown' | 'sync' }) => {
        // Изменения, пришедшие по Websocket (origin = 'sync'), не отправляем обратно в Y.Text,
        // чтобы не создавать эхо-цикл и не дублировать текст. Просто обновляем локальный стейт.
        const isRemote = meta?.origin === 'sync';
        if (isRemote) {
            setMarkdown(content);
            return;
        }

        // Локальные изменения из Milkdown или textarea — сохраняем в состояние и отправляем в Y.Text.
        setMarkdown(content);
        applyContentToYjs(content);

        if (textareaRef.current && meta?.origin === 'milkdown') {
            const cursorPos = textareaRef.current.selectionStart;
            const scrollTop = textareaRef.current.scrollTop;
            textareaRef.current.value = content;
            textareaRef.current.setSelectionRange(cursorPos, cursorPos);
            textareaRef.current.scrollTop = scrollTop;
        }

        if (meta?.origin === 'milkdown') {
            scheduleHistoryPush(content, true);
        }
    };

    const insertMarkdown = (prefix: string, suffix: string = '') => {
        const textarea = textareaRef.current;
        if (!textarea) return;

        const savedScrollTop = textarea.scrollTop;
        savedTextareaScrollRef.current = savedScrollTop;

        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const selectedText = markdown.substring(start, end);
        const newText =
            markdown.substring(0, start) + prefix + selectedText + suffix + markdown.substring(end);

        handleMarkdownChange(newText);

        setTimeout(() => {
            textarea.focus();
            textarea.setSelectionRange(start + prefix.length, end + prefix.length);
            textarea.scrollTop = savedScrollTop;
        }, 0);
    };

    return (
        <div className={cx(styles.viewer, className)}>
            <EditorToolbar
                previewMode={previewMode}
                onPreviewModeChange={setPreviewMode}
                onInsertMarkdown={insertMarkdown}
            />

            <div className={styles.editorContainer}>
                {showLoader && (
                    <div className={styles.loadingOverlay}>
                        <div className={styles.spinner}></div>
                        <p>Загрузка заметки...</p>
                    </div>
                )}
                <NoteViewerContent
                    previewMode={previewMode}
                    markdown={markdown}
                    noteId={noteId}
                    isLoading={isLoading}
                    textareaRef={textareaRef}
                    previewScrollContainerRef={previewScrollContainerRef}
                    previewContainerRef={previewContainerRef}
                    onMarkdownChange={handleMarkdownChange}
                    onTextAreaKeyDown={handleTextAreaKeyDown}
                    onContentChange={handleContentChange}
                    getToken={getToken}
                    sharedConnection={sharedConnection || undefined}
                    initialMarkdown={initialMarkdown}
                    onUndo={handleUndo}
                    onRedo={handleRedo}
                />
            </div>

            <EditorBottomBar
                wordCount={wordCount}
                isPublic={isPublic}
                ownerInfo={ownerInfo}
                ownerId={ownerId}
                connStatus={connStatus}
            />
        </div>
    );
};
