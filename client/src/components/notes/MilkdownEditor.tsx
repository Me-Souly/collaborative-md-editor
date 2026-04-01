import React, { useEffect, useRef, useState } from 'react';
import { Crepe, CrepeFeature } from '@milkdown/crepe';
import { editorViewCtx, parserCtx } from '@milkdown/core';
import { collab, collabServiceCtx } from '@milkdown/plugin-collab';
import { Ctx } from '@milkdown/ctx';
import { gapCursor } from 'prosemirror-gapcursor';
import { dropCursor } from 'prosemirror-dropcursor';
import { useIsMobile } from '@hooks/useMediaQuery';
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

export const MilkdownEditor: React.FC<MilkdownEditorProps> = ({
    noteId: _noteId,
    readOnly = false,
    placeholder = 'Введите текст…',
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
    const [isCreating, setIsCreating] = useState(true);
    const [contentLoaded, setContentLoaded] = useState(false);
    const [isConnected, setIsConnected] = useState(false);
    const [collabConnected, setCollabConnected] = useState(false);
    // True when Y.Text has content (IDB synced or initialMarkdown inserted) — faster than WebSocket
    const [ytextReady, setYtextReady] = useState(false);

    const isMobileDevice = useIsMobile();

    const crepeRef = useRef<Crepe | null>(null);
    const editorRef = useRef<any>(null); // raw Milkdown Editor (crepe.editor)
    const containerRef = useRef<HTMLDivElement | null>(null);
    const collabConnectedRef = useRef(false);

    const onContentChangeRef = useRef(onContentChange);
    useEffect(() => {
        onContentChangeRef.current = onContentChange;
    }, [onContentChange]);

    const effectiveReadOnly = expectSharedConnection ? false : readOnly;

    // ── Core initialization: Crepe replaces useEditor ─────────────────────────
    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const crepe = new Crepe({
            root: container,
            defaultValue: sharedConnection ? '' : (initialMarkdown || ''),
            features: {
                [CrepeFeature.Toolbar]:     !isMobileDevice, // floating format toolbar on text selection
                [CrepeFeature.BlockEdit]:   !isMobileDevice, // "/" slash menu (desktop only)
                [CrepeFeature.CodeMirror]:  true,            // syntax-highlighted code blocks
                [CrepeFeature.Placeholder]: true,
                [CrepeFeature.Cursor]:      false, // disable Crepe cursor — we use collab awareness cursors
                [CrepeFeature.ImageBlock]:  true,
                [CrepeFeature.LinkTooltip]: true,
                [CrepeFeature.ListItem]:    true,
                [CrepeFeature.Table]:       true,
                [CrepeFeature.Latex]:       false, // not used in app
            },
            featureConfigs: {
                [CrepeFeature.Placeholder]: {
                    text: placeholder,
                    mode: 'doc',
                },
            },
        });

        // MUST attach collab BEFORE create() — plugins freeze on create()
        crepe.editor.use(collab);

        let cancelled = false;
        crepe.create().then(() => {
            if (cancelled) return;

            // Register AFTER create() — during create(), editorViewCtx is not yet
            // injected, so the serializer behind markdownUpdated would throw
            // "Context editorView not found".
            crepe.on((api) => {
                api.markdownUpdated((_ctx: unknown, markdown: string) => {
                    onContentChangeRef.current?.(markdown, { origin: 'milkdown' });
                });
            });

            crepeRef.current = crepe;
            editorRef.current = crepe.editor;
            setIsCreating(false);
            setIsEditorReady(true);
        });

        return () => {
            cancelled = true;
            // No-op dispatch FIRST — prevents any state changes during cleanup
            // from triggering the serializer which needs editorViewCtx.
            try {
                crepe.editor.action((ctx: Ctx) => {
                    const view = ctx.get(editorViewCtx);
                    if (view) view.dispatch = () => {};
                });
            } catch { /* context already gone */ }
            // Disconnect collab AFTER silencing dispatch — collab disconnect can
            // trigger y-prosemirror updates that would otherwise hit the serializer.
            if (collabConnectedRef.current) {
                try {
                    crepe.editor.action((ctx: Ctx) => {
                        ctx.get(collabServiceCtx).disconnect();
                    });
                } catch { /* already gone */ }
                collabConnectedRef.current = false;
            }
            crepeRef.current = null;
            editorRef.current = null;
            setIsEditorReady(false);
            setIsCreating(true);
            crepe.destroy();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // intentionally empty — Crepe owns its own lifecycle

    // ── Watch Y.Text — fires when IDB or initialMarkdown populates it ─────────
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

    // ── Track provider connection status ──────────────────────────────────────
    useEffect(() => {
        const provider = sharedConnection?.provider;
        if (!provider) return;

        const handleStatus = (event: { status: string }) => {
            setIsConnected(event.status === 'connected');
        };

        provider.on('status', handleStatus);

        if (provider.wsconnected || provider.synced) {
            setIsConnected(true);
        }

        return () => {
            provider.off('status', handleStatus);
        };
    }, [sharedConnection?.provider]);

    // ── Add gap/drop cursor plugins ───────────────────────────────────────────
    useEffect(() => {
        if (!isEditorReady) return;
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
    }, [isEditorReady, effectiveReadOnly]);

    // ── Connect collab service when editor ready + content available ──────────
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
                if (yTextContent) {
                    collabService.applyTemplate(yTextContent);
                }

                // Fallback: if ProseMirror still empty after all that, apply directly
                const view = ctx.get(editorViewCtx);
                if (view && view.state.doc.textContent.length === 0 && yTextContent) {
                    const parser = ctx.get(parserCtx);
                    const pmDoc = parser(yTextContent);
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

    // ── Y.Text observer: apply textarea/undo changes to ProseMirror ──────────
    useEffect(() => {
        if (!isEditorReady || !collabConnected) return;
        const yText = sharedConnection?.text;
        if (!yText) return;
        const editor = editorRef.current;
        if (!editor) return;

        const observer = (event: any) => {
            const origin = event?.transaction?.origin;
            // Only handle textarea-origin changes and UndoManager reverts
            if (origin === 'milkdown' || origin === 'markdown-editor' || origin === 'y-prosemirror')
                return;
            const isUndoManagerOrigin =
                origin && typeof origin === 'object' && typeof (origin as any).undo === 'function';
            if (typeof origin !== 'string' && !isUndoManagerOrigin) return;

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

    // ── Apply readOnly via Crepe API ──────────────────────────────────────────
    useEffect(() => {
        if (!isEditorReady || !crepeRef.current) return;
        crepeRef.current.setReadonly(effectiveReadOnly);
    }, [isEditorReady, effectiveReadOnly]);

    // ── Undo/redo keyboard intercept (capture phase, before ProseMirror) ─────
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

                // true = capture phase — fires before ProseMirror's keymap (bubble phase)
                view.dom.addEventListener('keydown', handler, true);
                cleanup = () => view.dom.removeEventListener('keydown', handler, true);
            });
        } catch (error) {
            console.error('[MilkdownEditor] Error binding undo handlers:', error);
        }

        return () => cleanup?.();
    }, [expectSharedConnection, isEditorReady, onUndo, onRedo]);

    // ── Standalone mode (no sharedConnection) — mark as ready immediately ────
    useEffect(() => {
        if (!isEditorReady || sharedConnection) return;
        setIsConnected(true);
        setContentLoaded(true);
    }, [isEditorReady, sharedConnection]);

    // ── Loading indicator logic ───────────────────────────────────────────────
    useEffect(() => {
        if (!isCreating && isConnected && contentLoaded) {
            setShowLoadingIndicator(false);
        } else if (isCreating) {
            const timeout = setTimeout(() => setShowLoadingIndicator(false), 5000);
            return () => clearTimeout(timeout);
        }
    }, [isCreating, isConnected, contentLoaded]);

    const needsConnection = !!sharedConnection || expectSharedConnection;
    const isLoading = isCreating || (needsConnection && (!isConnected || !contentLoaded));
    const loadingMessage = isCreating
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
            />
        </div>
    );
};
