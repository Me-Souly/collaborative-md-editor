import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Milkdown, MilkdownProvider, useEditor } from '@milkdown/react';
import { Editor, defaultValueCtx, editorViewCtx, rootCtx } from '@milkdown/core';
import { commonmark } from '@milkdown/preset-commonmark';
import { listener, listenerCtx } from '@milkdown/plugin-listener';
import { slashFactory } from '@milkdown/plugin-slash';
import { tooltipFactory } from '@milkdown/plugin-tooltip';
import { Ctx } from '@milkdown/ctx';
import { gapCursor } from 'prosemirror-gapcursor';
import { dropCursor } from 'prosemirror-dropcursor';
import { keymap } from 'prosemirror-keymap';
import { useYjsConnection } from '@components/notes/hooks/useYjsConnection';
import { useMarkdownSync } from '@components/notes/hooks/useMarkdownSync';
import { useYjsTextUpdate } from '@components/notes/hooks/useYjsTextUpdate';
import * as styles from '@components/notes/MilkdownEditor.module.css';

const cx = (...classes: (string | undefined | false)[]) => classes.filter(Boolean).join(' ');

type MilkdownEditorProps = {
    noteId: string;
    readOnly?: boolean;
    placeholder?: string;
    onContentChange?: (content: string, meta?: { origin?: 'milkdown' | 'sync' }) => void;
    className?: string;
    getToken?: () => string | null;
    initialMarkdown?: string;
    sharedConnection?: {
        doc: any;
        provider: any;
        text: any;
        fragment: any;
    };
    expectSharedConnection?: boolean;
    onUndo?: () => void;
    onRedo?: () => void;
    hideLoadingIndicator?: boolean;
};

// Внутренний компонент, который использует useEditor внутри MilkdownProvider
const MilkdownEditorInner: React.FC<MilkdownEditorProps> = ({
    noteId,
    readOnly = false,
    placeholder: _placeholder = 'Введите текст…',
    onContentChange,
    className,
    getToken,
    initialMarkdown,
    sharedConnection,
    expectSharedConnection = false,
    onUndo,
    onRedo,
    hideLoadingIndicator = false,
}) => {
    const [showLoadingIndicator, setShowLoadingIndicator] = useState(true);
    const [isEditorReady, setIsEditorReady] = useState(false);
    const [contentLoaded, setContentLoaded] = useState(false);

    const editorRef = useRef<any>(null);
    const containerRef = useRef<HTMLDivElement | null>(null);
    const observerRef = useRef<((event: any) => void) | null>(null);
    const listenerRegisteredRef = useRef(false);

    // Refs для актуальных значений (чтобы listener не перерегистрировался при изменениях)
    const onContentChangeRef = useRef(onContentChange);
    const yTextRef = useRef<any>(null);
    const updateYTextRef = useRef<((markdown: string, origin: string, yText: any) => void) | null>(
        null,
    );
    const expectSharedConnectionRef = useRef(expectSharedConnection);

    // Обновляем refs при изменении props (для значений, доступных сразу)
    useEffect(() => {
        onContentChangeRef.current = onContentChange;
    }, [onContentChange]);

    useEffect(() => {
        expectSharedConnectionRef.current = expectSharedConnection;
    }, [expectSharedConnection]);

    const { get, loading } = useEditor((root) =>
        Editor.make()
            .config((ctx) => {
                ctx.set(rootCtx, root);
                ctx.set(defaultValueCtx, initialMarkdown || '');
            })
            .use(commonmark)
            .use(listener)
            .use(slashFactory('slash'))
            .use(tooltipFactory('tooltip')),
    );

    const effectiveReadOnly = expectSharedConnection ? false : readOnly;

    const { connection, yText, error, isConnected } = useYjsConnection({
        noteId,
        readOnly,
        getToken,
        sharedConnection,
        expectSharedConnection,
        initialMarkdown,
    });

    const { updateYText } = useYjsTextUpdate();

    // Обновляем refs при изменении yText и updateYText (после их определения)
    useEffect(() => {
        yTextRef.current = yText;
    }, [yText]);

    useEffect(() => {
        updateYTextRef.current = updateYText;
    }, [updateYText]);

    const {
        applyMarkdownToEditor: _applyMarkdownToEditor,
        setupYTextObserver,
        applyInitialMarkdown,
        applyingRemoteRef,
    } = useMarkdownSync({
        editorRef,
        effectiveReadOnly,
        onContentChange: (content, meta) => {
            onContentChange?.(content, meta);
            // Обновляем Y.Text только если изменения пришли от самого редактора
            if (yText && meta?.origin === 'milkdown') {
                updateYText(content, 'milkdown', yText);
            }
        },
        updateYText: (markdown, origin) => {
            if (yText) {
                updateYText(markdown, origin, yText);
            }
        },
    });

    // Настройка плагинов ProseMirror (кастомные хоткеи + курсоры)
    useEffect(() => {
        if (loading) return;
        if (!isEditorReady) return;
        const editor = editorRef.current;
        if (!editor) return;

        try {
            editor.action((ctx: Ctx) => {
                const view = ctx.get(editorViewCtx);
                if (!view) return;

                const state = view.state;
                const plugins = state.plugins;

                const customKeymap = keymap({
                    'Mod-z': () => true,
                    'Mod-y': () => true,
                    'Mod-Shift-z': () => true,
                });

                const newPlugins = [
                    ...plugins.filter((p) => {
                        const pluginKey = (p as any).key;
                        return pluginKey !== 'undo' && pluginKey !== 'redo';
                    }),
                    customKeymap,
                ];

                if (!effectiveReadOnly) {
                    newPlugins.push(gapCursor(), dropCursor());
                }

                view.updateState(view.state.reconfigure({ plugins: newPlugins }));
            });
        } catch (error) {
            console.error('[MilkdownEditor] Error configuring plugins:', error);
        }
    }, [loading, isEditorReady, effectiveReadOnly]);

    // Сохраняем ссылку на редактор после инициализации
    useEffect(() => {
        if (loading) return;
        try {
            const editor = get();
            if (editor) {
                editorRef.current = editor;
                setIsEditorReady(true);
            }
        } catch (error) {
            console.error('[MilkdownEditor] Error getting editor:', error);
        }
    }, [get, loading]);

    // Применение readOnly состояния
    const applyReadOnlyState = useCallback((readonlyFlag: boolean) => {
        const editor = editorRef.current;
        if (!editor) return;

        try {
            editor.action((ctx: Ctx) => {
                const view = ctx.get(editorViewCtx);
                if (!view) return;

                const editable = !readonlyFlag;
                view.setProps({
                    ...view.props,
                    editable: () => editable,
                });

                view.dom.contentEditable = editable ? 'true' : 'false';
                view.dom.setAttribute('contenteditable', editable ? 'true' : 'false');
                view.dom.style.userSelect = 'text';
                (view.dom.style as any).webkitUserSelect = 'text';
            });
        } catch (error) {
            console.error('[MilkdownEditor] Error toggling readOnly mode:', error);
        }
    }, []);

    useEffect(() => {
        if (!isEditorReady) return;
        applyReadOnlyState(effectiveReadOnly);
    }, [isEditorReady, effectiveReadOnly, applyReadOnlyState]);

    // Перехват undo/redo для preview режима
    useEffect(() => {
        if (!expectSharedConnection) return;
        if (!isEditorReady) return;
        if (!onUndo && !onRedo) return;

        const editor = editorRef.current;
        if (!editor) return;

        let cleanup: (() => void) | undefined;

        try {
            editor.action((ctx: Ctx) => {
                const view = ctx.get(editorViewCtx);
                if (!view) return;

                const handler = (event: KeyboardEvent) => {
                    const isMod = event.ctrlKey || event.metaKey;
                    if (!isMod) return;
                    const key = event.key.toLowerCase();

                    if (key === 'z') {
                        if (event.shiftKey) {
                            if (onRedo) {
                                event.preventDefault();
                                event.stopPropagation();
                                event.stopImmediatePropagation?.();
                                onRedo();
                            }
                        } else if (onUndo) {
                            event.preventDefault();
                            event.stopPropagation();
                            event.stopImmediatePropagation?.();
                            onUndo();
                        }
                    } else if (key === 'y' && onRedo) {
                        event.preventDefault();
                        event.stopPropagation();
                        event.stopImmediatePropagation?.();
                        onRedo();
                    }
                };

                view.dom.addEventListener('keydown', handler, true);
                cleanup = () => {
                    view.dom.removeEventListener('keydown', handler, true);
                };
            });
        } catch (error) {
            console.error('[MilkdownEditor] Error binding preview undo handlers:', error);
        }

        return () => {
            cleanup?.();
        };
    }, [expectSharedConnection, isEditorReady, onUndo, onRedo]);

    // Настройка listener для изменений из Milkdown (регистрируется ОДИН раз)
    useEffect(() => {
        if (!isEditorReady) return;
        if (listenerRegisteredRef.current) return; // Предотвращаем повторную регистрацию
        const editor = editorRef.current;
        if (!editor) return;

        try {
            editor.action((ctx: Ctx) => {
                const manager = ctx.get(listenerCtx as any) as any;
                if (!manager) return;

                // Регистрируем listener один раз, используя refs для актуальных значений
                manager.markdownUpdated((_ctx: unknown, markdown: string) => {
                    if (applyingRemoteRef.current) return;
                    onContentChangeRef.current?.(markdown, { origin: 'milkdown' });
                    // Обновляем Y.Text только если не используем sharedConnection
                    // В режиме с sharedConnection y-prosemirror сам синхронизирует через YXmlFragment
                    if (
                        yTextRef.current &&
                        !expectSharedConnectionRef.current &&
                        updateYTextRef.current
                    ) {
                        updateYTextRef.current(markdown, 'milkdown', yTextRef.current);
                    }
                });

                listenerRegisteredRef.current = true;
            });
        } catch (error) {
            console.error('[MilkdownEditor] Error setting up listener:', error);
        }
    }, [isEditorReady, applyingRemoteRef]); // Минимальные зависимости - только готовность редактора

    // Настройка Y.Text observer и начальное применение
    // В режиме с sharedConnection: ySyncPlugin синхронизирует ProseMirror <-> YXmlFragment
    // Y.Text observer нужен для синхронизации изменений из textarea (Y.Text -> ProseMirror)
    useEffect(() => {
        if (loading) return;
        if (!isEditorReady) return;
        const editor = editorRef.current;
        if (!editor) return;

        if (readOnly && expectSharedConnection && !sharedConnection && !connection) {
            return;
        }

        if (!yText) return;

        // В режиме с sharedConnection ySyncPlugin синхронизирует через YXmlFragment
        // Но нам все еще нужен observer для синхронизации изменений из textarea (Y.Text -> ProseMirror)
        const observer = setupYTextObserver(yText, editor);
        observerRef.current = observer;

        // Применяем начальный markdown только если не используется sharedConnection
        // В режиме с sharedConnection ySyncPlugin сам синхронизирует начальное состояние
        if (!expectSharedConnection || !sharedConnection) {
            const initialMarkdownToApply = yText?.toString?.() ?? '';
            if (initialMarkdownToApply) {
                // Небольшая задержка, чтобы ySyncPlugin успел инициализироваться (если используется)
                setTimeout(
                    () => {
                        if (editorRef.current) {
                            applyInitialMarkdown(initialMarkdownToApply, editor);
                            // Помечаем контент как загруженный
                            setContentLoaded(true);
                        }
                    },
                    expectSharedConnection ? 200 : 100,
                );
            } else {
                // Если нет начального контента, сразу помечаем как загруженный
                setContentLoaded(true);
            }
        } else {
            // В режиме с sharedConnection контент синхронизируется автоматически
            setContentLoaded(true);
        }

        return () => {
            if (yText && observerRef.current) {
                yText.unobserve(observerRef.current);
            }
            observerRef.current = null;
        };
    }, [
        loading,
        isEditorReady,
        yText,
        setupYTextObserver,
        applyInitialMarkdown,
        readOnly,
        expectSharedConnection,
        sharedConnection,
        connection,
    ]);

    // Управление индикатором загрузки
    useEffect(() => {
        // Скрываем прелоадер когда:
        // 1. Редактор загружен (!loading)
        // 2. Yjs подключен (isConnected)
        // 3. Контент загружен (contentLoaded)
        const shouldHideLoader = !loading && isConnected && contentLoaded;

        if (shouldHideLoader) {
            setShowLoadingIndicator(false);
        } else if (loading) {
            // Таймаут для случая, если что-то зависло
            const timeout = setTimeout(() => {
                setShowLoadingIndicator(false);
            }, 5000); // Увеличили до 5 секунд для загрузки контента
            return () => clearTimeout(timeout);
        }
    }, [loading, isConnected, contentLoaded]);

    if (error) {
        return (
            <div className={styles.errorState}>
                <strong>Ошибка подключения к Yjs:</strong>
                <div>{error}</div>
            </div>
        );
    }

    // Определяем, нужно ли показывать прелоадер
    const isLoading = loading || !isConnected || !contentLoaded;
    const loadingMessage = loading
        ? 'Загрузка редактора...'
        : !isConnected
          ? 'Подключение к серверу...'
          : 'Загрузка содержимого...';

    return (
        <div className={cx(styles.wrapper, className)}>
            {!hideLoadingIndicator && showLoadingIndicator && isLoading && (
                <div className={styles.loadingOverlay}>
                    <div className={styles.spinner}></div>
                    <p>{loadingMessage}</p>
                </div>
            )}
            <div
                ref={containerRef}
                className={cx(
                    readOnly ? 'milkdown-readonly-container' : 'milkdown-editor-container',
                    styles.editorContainer,
                )}
            >
                <Milkdown />
            </div>
        </div>
    );
};

// Внешний компонент, который оборачивает внутренний в MilkdownProvider
export const MilkdownEditor: React.FC<MilkdownEditorProps> = (props) => {
    return (
        <MilkdownProvider>
            <MilkdownEditorInner {...props} />
        </MilkdownProvider>
    );
};
