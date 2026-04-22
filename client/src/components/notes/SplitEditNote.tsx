import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { observer } from 'mobx-react-lite';
import { useNoteYDoc } from '@hooks/useNoteYDoc';
import { useConnectionStatus } from '@hooks/useConnectionStatus';
import { useAwareness } from '@hooks/useAwareness';
import { useAuthStore, useSettingsStore } from '@hooks/useStores';
import { useIsMobile } from '@hooks/useMediaQuery';
import { useScrollSync } from '@components/notes/hooks/useScrollSync';
import { EditorBottomBar } from '@components/notes/components/EditorBottomBar';
import { NoteViewerContent } from '@components/notes/components/NoteViewerContent';
import { EditorRightPanel } from '@components/notes/components/EditorRightPanel';
import { ExportMenu } from '@components/notes/components/ExportMenu';
import { InlineAiMenu } from '@components/notes/components/InlineAiMenu';
import {
    EyeOffIcon,
    Columns2Icon,
    AlignLeftIcon,
    MessageSquareIcon,
    SparklesIcon,
    ListIcon,
} from '@components/common/ui/icons';
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

export const SplitEditNote: React.FC<SplitEditNoteProps> = observer(
    ({
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
        const {
            markdown,
            setMarkdown,
            isLoading,
            sharedConnection,
            applyContentToYjs,
            registerTextareaRef,
            undo,
            redo,
        } = useNoteYDoc({
            noteId,
            getToken,
            enabled: true,
            shareToken,
        });

        const awareness = sharedConnection?.awareness ?? null;
        const yText = sharedConnection?.text ?? null;

        const authStore = useAuthStore();
        const settingsStore = useSettingsStore();
        const isMobile = useIsMobile();
        const userName = authStore.user?.login ?? authStore.user?.name ?? 'Unknown';
        const { remoteCursors, broadcastCursor, clearCursor } = useAwareness(
            awareness,
            yText,
            userName,
        );

        const [previewMode, setPreviewMode] = useState<PreviewMode>(() => {
            const isMobileNow =
                typeof window !== 'undefined' && window.matchMedia('(max-width: 768px)').matches;
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
        const [typewriterMode, setTypewriterMode] = useState(() =>
            localStorage.getItem('editor:typewriter') !== 'false'
        );
        const handleToggleTypewriter = () => setTypewriterMode(v => {
            localStorage.setItem('editor:typewriter', String(!v));
            return !v;
        });
        const [rightPanel, setRightPanel] = useState<'comments' | 'ai' | 'toc' | null>(null);
        const [pendingAnchor, setPendingAnchor] = useState<{ yjsAnchor: string; anchorText: string } | null>(null);
        const [aiTextSelection, setAiTextSelection] = useState<{ text: string; from: number; to: number; rect: DOMRect; doReplace: (md: string) => void; doInsertAfter: (md: string) => void; } | null>(null);
        const editorViewRef = useRef<any>(null);
        const scrollToAnchorRef = useRef<((base64: string, anchorText?: string | null) => void) | null>(null);
        const scrollToHeadingRef = useRef<((text: string) => void) | null>(null);
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

        const readingTime = Math.max(1, Math.ceil(wordCount / 200));

        // Extract headings for TOC
        const headings = useMemo(() => {
            const lines = markdown.split('\n');
            const result: { level: number; text: string }[] = [];
            for (const line of lines) {
                const m = line.match(/^(#{1,6})\s+(.+)/);
                if (m) result.push({ level: m[1].length, text: m[2].trim() });
            }
            return result;
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
            if (
                (event.ctrlKey || event.metaKey) &&
                !event.shiftKey &&
                event.key.toLowerCase() === 'z'
            ) {
                event.preventDefault();
                handleUndo();
                return;
            }
            if (
                ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'y') ||
                ((event.ctrlKey || event.metaKey) &&
                    event.shiftKey &&
                    event.key.toLowerCase() === 'z')
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

        const togglePanel = (tab: 'comments' | 'ai' | 'toc') => {
            setRightPanel((prev) => (prev === tab ? null : tab));
        };

        return (
            <div className={cx(styles.viewer, className)}>
                <div className={styles.editorContainer}>
                    {showLoader && (
                        <div className={styles.loadingOverlay}>
                            <div className={styles.spinner}></div>
                            <p>Loading note...</p>
                        </div>
                    )}
                    <div className={styles.editorMain}>
                        <div className={styles.floatingControls}>
                            <div className={styles.viewModePill}>
                                <button
                                    className={cx(
                                        styles.viewModePillBtn,
                                        previewMode === 'preview' && styles.viewModePillBtnActive,
                                    )}
                                    onClick={() => setPreviewMode('preview')}
                                    title="Preview"
                                >
                                    <AlignLeftIcon className={styles.toolbarIcon} />
                                </button>
                                {!isMobile && (
                                    <button
                                        className={cx(
                                            styles.viewModePillBtn,
                                            previewMode === 'split' && styles.viewModePillBtnActive,
                                        )}
                                        onClick={() => setPreviewMode('split')}
                                        title="Split view"
                                    >
                                        <Columns2Icon className={styles.toolbarIcon} />
                                    </button>
                                )}
                                <button
                                    className={cx(
                                        styles.viewModePillBtn,
                                        previewMode === 'edit' && styles.viewModePillBtnActive,
                                    )}
                                    onClick={() => setPreviewMode('edit')}
                                    title="Raw markdown"
                                >
                                    <EyeOffIcon className={styles.toolbarIcon} />
                                </button>
                            </div>
                            <div className={styles.floatingControlsSep} />
                            <button
                                className={cx(
                                    styles.floatingControlsBtn,
                                    rightPanel === 'comments' && styles.floatingControlsBtnActive,
                                )}
                                onClick={() => togglePanel('comments')}
                                title="Comments"
                            >
                                <MessageSquareIcon className={styles.toolbarIcon} />
                            </button>
                            <button
                                className={cx(
                                    styles.floatingControlsBtn,
                                    rightPanel === 'ai' && styles.floatingControlsBtnActive,
                                )}
                                onClick={() => togglePanel('ai')}
                                title="AI Assistant"
                            >
                                <SparklesIcon className={styles.toolbarIcon} />
                            </button>
                            <button
                                className={cx(
                                    styles.floatingControlsBtn,
                                    rightPanel === 'toc' && styles.floatingControlsBtnActive,
                                )}
                                onClick={() => togglePanel('toc')}
                                title="Содержание"
                            >
                                <ListIcon className={styles.toolbarIcon} />
                            </button>
                            <div className={styles.floatingControlsSep} />
                            <ExportMenu
                                markdown={markdown}
                                title={noteId}
                                editorContainerRef={previewContainerRef}
                            />
                        </div>
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
                            onSelectionChange={sel => {
                                setPendingAnchor(sel);
                                setRightPanel('comments');
                            }}
                            scrollToAnchorRef={scrollToAnchorRef}
                            scrollToHeadingRef={scrollToHeadingRef}
                            typewriterMode={typewriterMode}
                            keybindings={settingsStore.keybindings}
                            onTextSelected={setAiTextSelection}
                            editorViewOutRef={editorViewRef}
                        />
                    </div>
                    <EditorRightPanel
                        tab={rightPanel}
                        noteId={noteId}
                        onClose={() => setRightPanel(null)}
                        onTabChange={(tab) => setRightPanel(tab)}
                        pendingAnchor={pendingAnchor}
                        onClearAnchor={() => setPendingAnchor(null)}
                        onScrollToAnchor={(b64, text) => scrollToAnchorRef.current?.(b64, text)}
                        headings={headings}
                        onScrollToHeading={(text) => scrollToHeadingRef.current?.(text)}
                        scrollContainerRef={previewScrollContainerRef}
                        markdown={markdown}
                        selectedText={pendingAnchor?.anchorText ?? null}
                    />
                </div>

                <EditorBottomBar
                    wordCount={wordCount}
                    readingTime={readingTime}
                    isPublic={isPublic}
                    ownerInfo={ownerInfo}
                    ownerId={ownerId}
                    connStatus={connStatus}
                />
                <InlineAiMenu
                    selection={aiTextSelection}
                    markdown={markdown}
                    onReplace={(result) => aiTextSelection?.doReplace(result)}
                    onInsertAfter={(result) => aiTextSelection?.doInsertAfter(result)}
                    onDismiss={() => setAiTextSelection(null)}
                />
            </div>
        );
    },
);
