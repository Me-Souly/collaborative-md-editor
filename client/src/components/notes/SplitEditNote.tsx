import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { observer } from 'mobx-react-lite';
import { useNoteYDoc } from '@hooks/useNoteYDoc';
import { useConnectionStatus } from '@hooks/useConnectionStatus';
import { useAwareness } from '@hooks/useAwareness';
import { useAuthStore } from '@hooks/useStores';
import { useIsMobile } from '@hooks/useMediaQuery';
import { useScrollSync } from '@components/notes/hooks/useScrollSync';
import { EditorToolbar } from '@components/notes/components/EditorToolbar';
import { EditorBottomBar } from '@components/notes/components/EditorBottomBar';
import { NoteViewerContent } from '@components/notes/components/NoteViewerContent';
import { EditorRightPanel } from '@components/notes/components/EditorRightPanel';
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
    onRegisterFocus?: (fn: () => void) => void;
    shareToken?: string | null;
}

export const SplitEditNote: React.FC<SplitEditNoteProps> = observer(({
    noteId,
    getToken,
    className,
    initialMarkdown,
    ownerId,
    isPublic = false,
    onRegisterFocus,
    shareToken,
}) => {
    const _navigate = useNavigate();
    const { markdown, setMarkdown, isLoading, sharedConnection, applyContentToYjs, registerTextareaRef, undo, redo } = useNoteYDoc({
        noteId,
        getToken,
        enabled: true,
        shareToken,
    });

    const awareness = sharedConnection?.awareness ?? null;
    const yText = sharedConnection?.text ?? null;

    const authStore = useAuthStore();
    const isMobile = useIsMobile();
    const userName = authStore.user?.login ?? authStore.user?.name ?? 'Unknown';
    const { remoteCursors, broadcastCursor, clearCursor } = useAwareness(awareness, yText, userName);

    const [previewMode, setPreviewMode] = useState<PreviewMode>(() => {
        const isMobileNow = typeof window !== 'undefined'
            && window.matchMedia('(max-width: 768px)').matches;
        if (isMobileNow) return 'preview';
        const saved = localStorage.getItem('editor:previewMode');
        return saved === 'edit' || saved === 'preview' || saved === 'split' ? saved : 'split';
    });

    // On mobile, force out of split mode → fallback to preview
    useEffect(() => {
        if (isMobile && previewMode === 'split') {
            setPreviewMode('preview');
        }
    }, [isMobile]); // eslint-disable-line react-hooks/exhaustive-deps
    const [syncScroll, setSyncScroll] = useState(true);
    const [rightPanel, setRightPanel] = useState<'comments' | 'ai' | null>(null);
    const [wordCount, setWordCount] = useState(0);
    const [ownerInfo, _setOwnerInfo] = useState<{ login?: string; name?: string } | null>(null);
    const [showLoader, setShowLoader] = useState(true);

    const connStatus = useConnectionStatus(sharedConnection?.provider ?? null);

    const previewContainerRef = useRef<HTMLDivElement | null>(null);
    const textareaRef = useRef<HTMLTextAreaElement | null>(null);
    const previewScrollContainerRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        if (onRegisterFocus) {
            onRegisterFocus(() => textareaRef.current?.focus());
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [onRegisterFocus]);

    // Register textarea with useNoteYDoc for delta-based cursor preservation
    useEffect(() => {
        registerTextareaRef(textareaRef.current);
        return () => registerTextareaRef(null);
    // textareaRef.current is intentionally omitted — it's a ref
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [registerTextareaRef]);

    const handleUndo = undo;
    const handleRedo = redo;

    const { savedTextareaScrollRef } = useScrollSync(
        textareaRef,
        previewScrollContainerRef,
        previewMode,
        markdown,
        isLoading,
        syncScroll,
    );


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

    // Сохраняем режим редактора в localStorage
    useEffect(() => {
        localStorage.setItem('editor:previewMode', previewMode);
    }, [previewMode]);

    // Подсчет слов
    useEffect(() => {
        const words = markdown.trim().split(/\s+/).filter(Boolean).length;
        setWordCount(words);
    }, [markdown]);

    const handleMarkdownChange = (newContent: string) => {
        if (newContent === markdown) return;

        const textarea = textareaRef.current;
        if (textarea && document.activeElement === textarea) {
            savedTextareaScrollRef.current = textarea.scrollTop;
        }

        setMarkdown(newContent);
        applyContentToYjs(newContent);

        if (textarea && document.activeElement === textarea) {
            requestAnimationFrame(() => {
                if (textarea && document.activeElement === textarea) {
                    textarea.scrollTop = savedTextareaScrollRef.current;
                }
            });
        }
    };

    const handleTextAreaKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if ((event.ctrlKey || event.metaKey) && !event.shiftKey && event.key.toLowerCase() === 'z') {
            event.preventDefault();
            handleUndo();
            return;
        }
        if (
            ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'y') ||
            ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key.toLowerCase() === 'z')
        ) {
            event.preventDefault();
            handleRedo();
        }
    };

    const handleContentChange = (content: string, meta?: { origin?: 'milkdown' | 'sync' }) => {
        // Изменения, пришедшие по Websocket (origin = 'sync'), не отправляем обратно в Y.Text,
        // чтобы не создавать эхо-цикл и не дублировать текст. Просто обновляем локальный стейт.
        const isRemote = meta?.origin === 'sync';
        if (isRemote) {
            setMarkdown(content);
            return;
        }

        // Если textarea сейчас в фокусе, пользователь печатает именно там —
        // textarea является источником истины. Async-колбэки Milkdown с устаревшим
        // контентом могли бы перезаписать Y.Text и испортить набранный текст.
        if (
            meta?.origin === 'milkdown' &&
            textareaRef.current &&
            document.activeElement === textareaRef.current
        ) {
            return;
        }

        // Локальные изменения из Milkdown — сохраняем в состояние и отправляем в Y.Text.
        // Передаём origin 'milkdown', чтобы Y.Text observer в setupYTextObserver корректно
        // пропустил это изменение через явную проверку origin (а не через хрупкий editorFocused).
        setMarkdown(content);
        applyContentToYjs(content, 'milkdown');

        if (textareaRef.current && meta?.origin === 'milkdown') {
            const cursorPos = textareaRef.current.selectionStart;
            const scrollTop = textareaRef.current.scrollTop;
            textareaRef.current.value = content;
            textareaRef.current.setSelectionRange(cursorPos, cursorPos);
            textareaRef.current.scrollTop = scrollTop;
        }

    };

    const insertMarkdown = (prefix: string, suffix: string = '') => {
        const textarea = textareaRef.current;
        if (!textarea) return;

        // If focus is inside the Milkdown (preview) pane rather than the textarea,
        // redirect insertion to the textarea. Use its last known position; if it was
        // never focused (selectionStart === 0 and doc is non-empty), fall back to end.
        const previewRoot = previewContainerRef.current;
        const isInPreview = previewRoot?.contains(document.activeElement ?? null);
        if (isInPreview) {
            const pos = textarea.selectionStart === 0 && textarea.value.length > 0
                ? textarea.value.length
                : textarea.selectionStart;
            textarea.focus();
            textarea.setSelectionRange(pos, pos);
        }

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

    const togglePanel = (tab: 'comments' | 'ai') => {
        setRightPanel((prev) => (prev === tab ? null : tab));
    };

    return (
        <div className={cx(styles.viewer, className)}>
            <EditorToolbar
                onInsertMarkdown={insertMarkdown}
                previewMode={previewMode}
                onPreviewModeChange={setPreviewMode}
                rightPanel={rightPanel}
                onToggleComments={() => togglePanel('comments')}
                onToggleAI={() => togglePanel('ai')}
                isMobile={isMobile}
            />

            <div className={styles.editorContainer}>
                {showLoader && (
                    <div className={styles.loadingOverlay}>
                        <div className={styles.spinner}></div>
                        <p>Loading note...</p>
                    </div>
                )}
                <div className={styles.editorMain}>
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
                        onPreviewModeChange={setPreviewMode}
                        syncScroll={syncScroll}
                        onToggleSyncScroll={() => setSyncScroll((v) => !v)}
                        remoteCursors={remoteCursors}
                        broadcastCursor={broadcastCursor}
                        clearCursor={clearCursor}
                        isMobile={isMobile}
                    />
                </div>
                <EditorRightPanel
                    tab={rightPanel}
                    onClose={() => setRightPanel(null)}
                    onTabChange={(tab) => setRightPanel(tab)}
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
});
