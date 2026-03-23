import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Milkdown, MilkdownProvider, useEditor } from '@milkdown/react';
import { Editor, defaultValueCtx, editorViewCtx, rootCtx, parserCtx } from '@milkdown/core';
import { commonmark } from '@milkdown/preset-commonmark';
import { gfm } from '@milkdown/preset-gfm';
import { listener, listenerCtx } from '@milkdown/plugin-listener';
import { collab, collabServiceCtx } from '@milkdown/plugin-collab';
import { slashFactory } from '@milkdown/plugin-slash';
import { tooltipFactory } from '@milkdown/plugin-tooltip';
import { Ctx } from '@milkdown/ctx';
import { gapCursor } from 'prosemirror-gapcursor';
import { dropCursor } from 'prosemirror-dropcursor';
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
        awareness?: any;
    };
    expectSharedConnection?: boolean;
    onUndo?: () => void;
    onRedo?: () => void;
    hideLoadingIndicator?: boolean;
};

const MilkdownEditorInner: React.FC<MilkdownEditorProps> = ({
    noteId: _noteId,
    readOnly = false,
    placeholder: _placeholder = 'Введите текст…',
    onContentChange,
    className,
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
    const [isConnected, setIsConnected] = useState(false);
    const [collabConnected, setCollabConnected] = useState(false);
    // True when Y.Text has content (IDB synced or initialMarkdown inserted) — faster than WebSocket
    const [ytextReady, setYtextReady] = useState(false);

    const editorRef = useRef<any>(null);
    const containerRef = useRef<HTMLDivElement | null>(null);
    const listenerRegisteredRef = useRef(false);
    const collabConnectedRef = useRef(false);

    const onContentChangeRef = useRef(onContentChange);
    useEffect(() => {
        onContentChangeRef.current = onContentChange;
    }, [onContentChange]);

    const { get, loading } = useEditor((root) =>
        Editor.make()
            .config((ctx) => {
                ctx.set(rootCtx, root);
                ctx.set(defaultValueCtx, initialMarkdown || '');
            })
            .use(commonmark)
            .use(gfm)

            .use(listener)
            .use(collab)
            .use(slashFactory('slash'))
            .use(tooltipFactory('tooltip')),
    );

    const effectiveReadOnly = expectSharedConnection ? false : readOnly;

    // Watch Y.Text — fires when IDB or initialMarkdown populates it (faster than WebSocket)
    useEffect(() => {
        const text = sharedConnection?.text;
        if (!text) {
            setYtextReady(false);
            return;
        }
        if (text.toString().length > 0) {
            setYtextReady(true);
            return;
        }
        const check = () => {
            if (text.toString().length > 0) {
                setYtextReady(true);
            }
        };
        text.observe(check);
        return () => {
            setYtextReady(false);
            text.unobserve(check);
        };
    }, [sharedConnection?.text]);

    // Track provider connection status directly
    useEffect(() => {
        const provider = sharedConnection?.provider;
        if (!provider) return;

        const handleStatus = (event: { status: string }) => {
            setIsConnected(event.status === 'connected');
        };

        provider.on('status', handleStatus);

        // Check if already connected
        if (provider.wsconnected || provider.synced) {
            setIsConnected(true);
        }

        return () => {
            provider.off('status', handleStatus);
        };
    }, [sharedConnection?.provider]);

    // Save editor ref
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

    // Add gap/drop cursor plugins
    useEffect(() => {
        if (loading || !isEditorReady) return;
        const editor = editorRef.current;
        if (!editor || effectiveReadOnly) return;

        try {
            editor.action((ctx: Ctx) => {
                const view = ctx.get(editorViewCtx);
                if (!view) return;
                const plugins = view.state.plugins;
                const newPlugins = [...plugins, gapCursor(), dropCursor()];
                view.updateState(view.state.reconfigure({ plugins: newPlugins }));
            });
        } catch (error) {
            console.error('[MilkdownEditor] Error configuring plugins:', error);
        }
    }, [loading, isEditorReady, effectiveReadOnly]);

    // Connect collab service when editor ready + Y.Text has content (fast) OR WebSocket connected (fallback)
    useEffect(() => {
        if (!isEditorReady || (!ytextReady && !isConnected)) return;
        if (!sharedConnection?.doc) return;
        if (collabConnectedRef.current) return;

        const editor = editorRef.current;
        if (!editor) return;

        const { doc, awareness, text } = sharedConnection;

        try {
            editor.action((ctx: Ctx) => {
                const collabService = ctx.get(collabServiceCtx);
                collabService.bindDoc(doc);

                if (awareness) {
                    collabService.setAwareness(awareness);
                }

                collabService.setOptions({
                    yCursorOpts: {
                        cursorBuilder: (user: any) => {
                            // Zero-height wrapper so the span never expands line height.
                            // The visual caret and label are absolutely positioned children.
                            const wrap = document.createElement('span');
                            wrap.style.cssText =
                                'position:relative;display:inline-block;width:0;height:0;overflow:visible;pointer-events:none;';

                            const caret = document.createElement('span');
                            caret.style.cssText =
                                `position:absolute;top:-1em;left:-1px;height:1.15em;` +
                                `border-left:2px solid ${user.color};pointer-events:none;`;

                            const label = document.createElement('span');
                            label.style.cssText =
                                `position:absolute;top:-3em;left:-1px;` +
                                `background:${user.color};color:#fff;` +
                                `font-size:11px;font-family:system-ui,sans-serif;` +
                                `padding:1px 5px;border-radius:3px 3px 3px 0;` +
                                `white-space:nowrap;pointer-events:none;user-select:none;`;
                            label.textContent = user.name;

                            wrap.appendChild(caret);
                            wrap.appendChild(label);
                            return wrap;
                        },
                    },
                });

                // Connect FIRST — ySyncPlugin starts watching XmlFragment
                collabService.connect();
                collabConnectedRef.current = true;
                setCollabConnected(true);

                // Migrate: if XmlFragment empty but Y.Text has content, populate it
                const yTextContent = text?.toString?.() ?? '';
                const templateContent = yTextContent;
                if (templateContent) {
                    collabService.applyTemplate(templateContent);
                }

                // Fallback: if ProseMirror still empty after all that, apply directly
                const view = ctx.get(editorViewCtx);
                if (view && view.state.doc.textContent.length === 0 && templateContent) {
                    const parser = ctx.get(parserCtx);
                    const pmDoc = parser(templateContent);
                    if (pmDoc) {
                        const tr = view.state.tr.replaceWith(
                            0,
                            view.state.doc.content.size,
                            pmDoc.content,
                        );
                        tr.setMeta('addToHistory', false);
                        view.dispatch(tr);
                    }
                }

                setContentLoaded(true);
            });
        } catch (error) {
            console.error('[MilkdownEditor] Error connecting collab:', error);
        }

        return () => {
            if (!collabConnectedRef.current) return;
            try {
                editor.action((ctx: Ctx) => {
                    ctx.get(collabServiceCtx).disconnect();
                });
            } catch {
                // Editor destroyed
            }
            collabConnectedRef.current = false;
        };
    }, [isEditorReady, ytextReady, isConnected, sharedConnection, initialMarkdown]);

    // Y.Text observer: apply textarea changes to ProseMirror
    useEffect(() => {
        if (!isEditorReady || !collabConnected) return;
        const yText = sharedConnection?.text;
        if (!yText) return;
        const editor = editorRef.current;
        if (!editor) return;

        const observer = (event: any) => {
            const origin = event?.transaction?.origin;
            // Only handle textarea-origin changes
            if (origin === 'milkdown' || origin === 'markdown-editor' || origin === 'y-prosemirror')
                return;
            if (typeof origin !== 'string') return;

            const markdown = yText?.toString?.() ?? '';
            try {
                editor.action((ctx: Ctx) => {
                    let parser;
                    try {
                        parser = ctx.get(parserCtx);
                    } catch {
                        return;
                    }
                    const view = ctx.get(editorViewCtx);
                    if (!parser || !view) return;

                    const doc = parser(markdown);
                    if (!doc) return;

                    const tr = view.state.tr.replaceWith(
                        0,
                        view.state.doc.content.size,
                        doc.content,
                    );
                    tr.setMeta('addToHistory', false);
                    view.dispatch(tr);
                });
            } catch {
                // Editor not ready
            }
        };

        yText.observe(observer);
        return () => {
            yText.unobserve(observer);
        };
    }, [isEditorReady, collabConnected, sharedConnection?.text]);

    // Apply readOnly state
    const applyReadOnlyState = useCallback((readonlyFlag: boolean) => {
        const editor = editorRef.current;
        if (!editor) return;
        try {
            editor.action((ctx: Ctx) => {
                const view = ctx.get(editorViewCtx);
                if (!view) return;
                const editable = !readonlyFlag;
                view.setProps({ ...view.props, editable: () => editable });
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

    // Milkdown markdownUpdated listener — syncs Milkdown → Y.Text via onContentChange
    useEffect(() => {
        if (!isEditorReady) return;
        if (listenerRegisteredRef.current) return;
        const editor = editorRef.current;
        if (!editor) return;

        try {
            editor.action((ctx: Ctx) => {
                const manager = ctx.get(listenerCtx as any) as any;
                if (!manager) return;

                manager.markdownUpdated((_ctx: unknown, markdown: string) => {
                    onContentChangeRef.current?.(markdown, { origin: 'milkdown' });
                });

                listenerRegisteredRef.current = true;
            });
        } catch (error) {
            console.error('[MilkdownEditor] Error setting up listener:', error);
        }
    }, [isEditorReady]);

    // Undo/redo intercept for preview mode
    useEffect(() => {
        if (!expectSharedConnection || !isEditorReady) return;
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
                cleanup = () => view.dom.removeEventListener('keydown', handler, true);
            });
        } catch (error) {
            console.error('[MilkdownEditor] Error binding undo handlers:', error);
        }

        return () => cleanup?.();
    }, [expectSharedConnection, isEditorReady, onUndo, onRedo]);

    // Если нет sharedConnection — редактор работает автономно, ждать сервер не нужно
    useEffect(() => {
        if (!isEditorReady || sharedConnection) return;
        setIsConnected(true);
        setContentLoaded(true);
    }, [isEditorReady, sharedConnection]);

    // Loading indicator
    useEffect(() => {
        if (!loading && isConnected && contentLoaded) {
            setShowLoadingIndicator(false);
        } else if (loading) {
            const timeout = setTimeout(() => setShowLoadingIndicator(false), 5000);
            return () => clearTimeout(timeout);
        }
    }, [loading, isConnected, contentLoaded]);

    const needsConnection = !!sharedConnection || expectSharedConnection;
    const isLoading = loading || (needsConnection && (!isConnected || !contentLoaded));
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

export const MilkdownEditor: React.FC<MilkdownEditorProps> = (props) => {
    return (
        <MilkdownProvider>
            <MilkdownEditorInner {...props} />
        </MilkdownProvider>
    );
};
