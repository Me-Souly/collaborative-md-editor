import React, { useEffect, useRef, useState } from 'react';
import { Crepe, CrepeFeature } from '@milkdown/crepe';
import { editorViewCtx, parserCtx } from '@milkdown/core';
import { collab, collabServiceCtx } from '@milkdown/plugin-collab';
import { Ctx } from '@milkdown/ctx';
import { gapCursor } from 'prosemirror-gapcursor';
import { dropCursor } from 'prosemirror-dropcursor';
import { TextSelection, Plugin as PmPlugin } from 'prosemirror-state';
import { Slice, Fragment } from 'prosemirror-model';
import * as Y from 'yjs';
import {
    absolutePositionToRelativePosition,
    relativePositionToAbsolutePosition,
    ySyncPluginKey,
} from 'y-prosemirror';
import { useIsMobile } from '@hooks/useMediaQuery';
import { createFindPlugin } from '@features/find/find-plugin';
import { keymap } from 'prosemirror-keymap';
import { DEFAULT_KEYBINDINGS } from '@stores/settingsStore';
import FileService from '@service/FileService';
import { fileBlockComponent } from '@features/file-block';
import * as styles from '@components/notes/MilkdownEditor.module.css';

/** base64 ↔ Uint8Array (no spread — compatible with ES5 targets) */
function uint8ToBase64(buf: Uint8Array): string {
    let s = '';
    for (let i = 0; i < buf.length; i++) s += String.fromCharCode(buf[i]);
    return btoa(s);
}
function base64ToUint8(b64: string): Uint8Array {
    const binary = atob(b64);
    const buf = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) buf[i] = binary.charCodeAt(i);
    return buf;
}

const cx = (...classes: (string | undefined | false)[]) => classes.filter(Boolean).join(' ');

function buildCustomKeymap(kb: import('@stores/settingsStore').Keybindings): PmPlugin {
    return keymap({
        [kb.duplicateLine]: (state, dispatch) => {
            const { $from, $to } = state.selection;
            const start = $from.before($from.depth > 0 ? $from.depth : 1);
            const end = $to.after($to.depth > 0 ? $to.depth : 1);
            if (start < 0 || end > state.doc.content.size) return false;
            const node = state.doc.slice(start, end);
            if (dispatch) dispatch(state.tr.insert(end, node.content));
            return true;
        },
        [kb.deleteLine]: (state, dispatch) => {
            const { $from, $to } = state.selection;
            const start = $from.before($from.depth > 0 ? $from.depth : 1);
            const end = $to.after($to.depth > 0 ? $to.depth : 1);
            if (start < 0 || end > state.doc.content.size) return false;
            if (dispatch) dispatch(state.tr.delete(start, end));
            return true;
        },
        [kb.moveParagraphUp]: (state, dispatch) => {
            const { $from } = state.selection;
            const index = $from.index(0);
            if (index === 0) return false;
            const node = state.doc.child(index);
            const prev = state.doc.child(index - 1);
            const nodeStart = state.doc.resolve($from.before(1)).pos;
            const prevStart = nodeStart - prev.nodeSize;
            if (dispatch) {
                const tr = state.tr;
                tr.replaceWith(prevStart, nodeStart + node.nodeSize, [node, prev] as any);
                dispatch(tr);
            }
            return true;
        },
        [kb.moveParagraphDown]: (state, dispatch) => {
            const { $from } = state.selection;
            const index = $from.index(0);
            if (index >= state.doc.childCount - 1) return false;
            const node = state.doc.child(index);
            const next = state.doc.child(index + 1);
            const nodeStart = state.doc.resolve($from.before(1)).pos;
            const nextEnd = nodeStart + node.nodeSize + next.nodeSize;
            if (dispatch) {
                const tr = state.tr;
                tr.replaceWith(nodeStart, nextEnd, [next, node] as any);
                dispatch(tr);
            }
            return true;
        },
        [kb.insertHR]: (state, dispatch) => {
            const hrType = state.schema.nodes['hr'] ?? state.schema.nodes['horizontal_rule'];
            if (!hrType) return false;
            if (dispatch) {
                const { $to } = state.selection;
                const end = $to.after($to.depth > 0 ? $to.depth : 1);
                dispatch(state.tr.insert(end, hrType.create()));
            }
            return true;
        },
    });
}

/**
 * After ProseMirror's scrollIntoView(), smoothly re-scroll so the target sits
 * at ~30% from the top of the scrollable editor container instead of the edge.
 */
function scrollEditorToCenter(view: any, pos: number): void {
    requestAnimationFrame(() => {
        try {
            const coords = view.coordsAtPos(pos);
            let el: HTMLElement | null = view.dom.parentElement;
            while (el) {
                const ov = window.getComputedStyle(el).overflowY;
                if (ov === 'auto' || ov === 'scroll') break;
                el = el.parentElement;
            }
            if (!el) return;
            const rect = el.getBoundingClientRect();
            const targetOffset = el.scrollTop + (coords.top - rect.top) - el.clientHeight * 0.3;
            el.scrollTo({ top: Math.max(0, targetOffset), behavior: 'smooth' });
        } catch { /* view gone */ }
    });
}

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
    /** Fires when the user creates/clears a non-empty text selection (for inline comment creation) */
    onSelectionChange?: (sel: { yjsAnchor: string; anchorText: string } | null) => void;
    /** Assign a ref to expose scrollToAnchor(base64) imperatively */
    scrollToAnchorRef?: { current: ((base64: string, anchorText?: string | null) => void) | null };
    /** Assign a ref to expose scrollToHeading(headingText) imperatively */
    scrollToHeadingRef?: { current: ((text: string) => void) | null };
    /** Typewriter mode: keep cursor at ~40% from top on every transaction */
    typewriterMode?: boolean;
    /** Expose the raw ProseMirror EditorView for Find & Replace */
    editorViewRef?: { current: any };
    /** Custom keybindings from settingsStore */
    keybindings?: import('@stores/settingsStore').Keybindings;
    /** Fires when user selects text — passes text + screen coords for inline AI menu */
    onTextSelected?: (sel: {
        text: string;
        from: number;
        to: number;
        rect: DOMRect;
        /** Insert parsed markdown, replacing [from, to] */
        doReplace: (md: string) => void;
        /** Insert parsed markdown after position to */
        doInsertAfter: (md: string) => void;
    } | null) => void;
};

export const MilkdownEditor: React.FC<MilkdownEditorProps> = ({
    noteId,
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
    onSelectionChange,
    scrollToAnchorRef,
    scrollToHeadingRef,
    typewriterMode = false,
    editorViewRef,
    keybindings,
    onTextSelected,
}) => {
    const typewriterModeRef = useRef(typewriterMode);
    useEffect(() => { typewriterModeRef.current = typewriterMode; }, [typewriterMode]);

    const keybindingsRef = useRef(keybindings);
    useEffect(() => { keybindingsRef.current = keybindings; }, [keybindings]);
    const customKeymapPluginRef = useRef<PmPlugin | null>(null);
    const keybindingsInitDoneRef = useRef(false);
    const onTextSelectedRef = useRef(onTextSelected);
    useEffect(() => { onTextSelectedRef.current = onTextSelected; }, [onTextSelected]);

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
    // Captures whether a sharedConnection will be passed — stable at mount time,
    // unlike sharedConnection itself which starts as null and is set asynchronously.
    const sharedConnectionPassedRef = useRef(!!sharedConnection || expectSharedConnection);

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
            // sharedConnection is null at mount time (set asynchronously via useEffect in
            // useNoteYDoc), so we cannot use it here. sharedConnectionPassedRef captures
            // whether the parent *intends* to pass a connection — if yes, start empty so
            // Crepe never fires markdownUpdated with initialMarkdown before WS sync, which
            // would create CRDT items with a browser clientId that conflict with the server's
            // authoritative state and produce duplicated content after the merge.
            defaultValue: sharedConnectionPassedRef.current ? '' : (initialMarkdown || ''),
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
                [CrepeFeature.Latex]:       true,
            },
            featureConfigs: {
                [CrepeFeature.Placeholder]: {
                    text: placeholder,
                    mode: 'doc',
                },
                [CrepeFeature.ImageBlock]: {
                    onUpload: async (file: File) => {
                        const { data } = await FileService.upload(noteId, file);
                        return FileService.resolveUrl(data.url);
                    },
                    blockUploadPlaceholderText: 'Перетащите или выберите изображение...',
                    inlineUploadPlaceholderText: 'Вставьте ссылку на изображение...',
                },
                [CrepeFeature.Toolbar]: {
                    buildToolbar: (builder: any) => {
                        builder.addGroup('ai', 'AI').addItem('ai-inline', {
                            icon: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>',
                            active: () => false,
                            onRun: (ctx: any) => {
                                const view = ctx.get(editorViewCtx);
                                if (!view) return;
                                const { from, to, empty } = view.state.selection;
                                if (empty) return;
                                const text = view.state.doc.textBetween(from, to, ' ').trim();
                                if (!text) return;
                                const coords = view.coordsAtPos(from);
                                const rect = new DOMRect(coords.left, coords.top, coords.right - coords.left, coords.bottom - coords.top);

                                const insertParsed = (md: string, replaceFrom: number, replaceTo: number) => {
                                    try {
                                        editorRef.current?.action((ctx2: Ctx) => {
                                            const v = ctx2.get(editorViewCtx);
                                            if (!v) return;
                                            const parser = ctx2.get(parserCtx);
                                            const parsed = parser(md);
                                            if (!parsed) return;
                                            const fragment = Fragment.fromArray(parsed.content.content);
                                            const slice = new Slice(fragment, 0, 0);
                                            v.dispatch(v.state.tr.replace(replaceFrom, replaceTo, slice));
                                        });
                                    } catch { /* view gone */ }
                                };

                                onTextSelectedRef.current?.({
                                    text, from, to, rect,
                                    doReplace: (md) => insertParsed(md, from, to),
                                    doInsertAfter: (md) => insertParsed(md, to, to),
                                });
                            },
                        });
                    },
                },
            },
        });

        // MUST attach plugins BEFORE create() — plugins freeze on create()
        crepe.editor.use(collab);
        crepe.editor.use(fileBlockComponent);

        let cancelled = false;
        crepe.create().then(() => {
            if (cancelled) return;

            // Register AFTER create() — during create(), editorViewCtx is not yet
            // injected, so the serializer behind markdownUpdated would throw
            // "Context editorView not found".
            crepe.on((api) => {
                api.markdownUpdated((_ctx: unknown, markdown: string) => {
                    console.log(`[Milkdown] markdownUpdated len=${markdown.length} preview="${markdown.slice(0,60).replace(/\n/g,'↵')}"`);
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

    // ── Stable ref for noteId (used inside ProseMirror plugin) ─────────────
    const noteIdRef = useRef(noteId);
    useEffect(() => { noteIdRef.current = noteId; }, [noteId]);

    // ── Add gap/drop cursor plugins ────────────────────────────────────────────
    useEffect(() => {
        if (!isEditorReady) return;
        const editor = editorRef.current;
        if (!editor || effectiveReadOnly) return;

        try {
            editor.action((ctx: Ctx) => {
                const view = ctx.get(editorViewCtx);
                if (!view) return;
                const plugins = view.state.plugins;
                const typewriterPlugin = new PmPlugin({
                    view() {
                        return {
                            update(v, prevState) {
                                if (!typewriterModeRef.current) return;
                                if (v.state.doc === prevState.doc && v.state.selection.eq(prevState.selection)) return;
                                const { from } = v.state.selection;
                                scrollEditorToCenter(v, from);
                            },
                        };
                    },
                });
                // ── Custom keymap ────────────────────────────────────────────
                const customKeymap = buildCustomKeymap(keybindingsRef.current ?? DEFAULT_KEYBINDINGS);
                customKeymapPluginRef.current = customKeymap;
                const newPlugins = [...plugins, gapCursor(), dropCursor(), typewriterPlugin, createFindPlugin(), customKeymap];
                view.updateState(view.state.reconfigure({ plugins: newPlugins }));
                if (editorViewRef) editorViewRef.current = view;
            });
        } catch (error) {
            console.error('[MilkdownEditor] Error configuring plugins:', error);
        }
    }, [isEditorReady, effectiveReadOnly]);

    // ── Rebuild keymap when keybindings change ─────────────────────────────────
    // Guard: skip on initial mount — init effect already added the keymap.
    useEffect(() => {
        if (!isEditorReady || effectiveReadOnly || !keybindings) return;
        if (!keybindingsInitDoneRef.current) {
            keybindingsInitDoneRef.current = true;
            return;
        }
        const editor = editorRef.current;
        if (!editor) return;
        try {
            editor.action((ctx: Ctx) => {
                const view = ctx.get(editorViewCtx);
                if (!view) return;
                const newKeymap = buildCustomKeymap(keybindings);
                const plugins = view.state.plugins.filter(p => p !== customKeymapPluginRef.current);
                customKeymapPluginRef.current = newKeymap;
                view.updateState(view.state.reconfigure({ plugins: [...plugins, newKeymap] }));
            });
        } catch { /* view gone */ }
    }, [keybindings, isEditorReady, effectiveReadOnly]);

    // ── File drag-and-drop & paste handling ─────────────────────────────────
    useEffect(() => {
        if (!isEditorReady) return;
        const container = containerRef.current;
        const editor = editorRef.current;
        if (!container || !editor || effectiveReadOnly) return;

        const insertUploadedFile = (file: File, pos: number) => {
            const isImage = file.type.startsWith('image/');

            FileService.upload(noteIdRef.current, file).then(({ data }) => {
                editor.action((ctx: Ctx) => {
                    const view = ctx.get(editorViewCtx);
                    if (!view) return;
                    const insertPos = Math.min(pos, view.state.doc.content.size);

                    if (isImage) {
                        const nodeType = view.state.schema.nodes['image-block'];
                        if (!nodeType) {
                            console.error('[MilkdownEditor] image-block not in schema');
                            return;
                        }
                        const node = nodeType.create({ src: FileService.resolveUrl(data.url) });
                        view.dispatch(view.state.tr.insert(insertPos, node));
                    } else {
                        const nodeType = view.state.schema.nodes['file-block'];
                        if (!nodeType) {
                            console.error('[MilkdownEditor] file-block not in schema');
                            return;
                        }
                        const node = nodeType.create({
                            src: FileService.resolveUrl(data.url),
                            filename: data.originalName,
                            mimeType: data.mimeType,
                            size: data.size,
                        });
                        view.dispatch(view.state.tr.insert(insertPos, node));
                    }
                });
            }).catch((err) => {
                console.error('[MilkdownEditor] File upload failed:', err);
            });
        };

        const handleDrop = (event: DragEvent) => {
            const files = event.dataTransfer?.files;
            if (!files?.length) return;

            event.preventDefault();
            event.stopPropagation();

            editor.action((ctx: Ctx) => {
                const view = ctx.get(editorViewCtx);
                if (!view) return;
                const coords = { left: event.clientX, top: event.clientY };
                const pos = view.posAtCoords(coords)?.pos ?? view.state.selection.from;

                for (const file of Array.from(files)) {
                    insertUploadedFile(file, pos);
                }
            });
        };

        const handlePaste = (event: ClipboardEvent) => {
            const files = event.clipboardData?.files;
            if (!files?.length) return;

            event.preventDefault();

            editor.action((ctx: Ctx) => {
                const view = ctx.get(editorViewCtx);
                if (!view) return;
                const pos = view.state.selection.from;

                for (const file of Array.from(files)) {
                    insertUploadedFile(file, pos);
                }
            });
        };

        const handleDragOver = (event: DragEvent) => {
            if (event.dataTransfer?.types?.includes('Files')) {
                event.preventDefault();
                event.dataTransfer.dropEffect = 'copy';
            }
        };

        container.addEventListener('drop', handleDrop);
        container.addEventListener('paste', handlePaste);
        container.addEventListener('dragover', handleDragOver);

        return () => {
            container.removeEventListener('drop', handleDrop);
            container.removeEventListener('paste', handlePaste);
            container.removeEventListener('dragover', handleDragOver);
        };
    }, [isEditorReady, effectiveReadOnly]);

    // ── Connect collab service when editor ready + content available ──────────
    useEffect(() => {
        if (!isEditorReady || (!ytextReady && !isConnected)) return;
        if (!sharedConnection?.doc) return;
        if (collabConnectedRef.current) return; // Already connected — skip re-entry

        const editor = editorRef.current;
        if (!editor) return;

        const { doc, awareness, text, fragment } = sharedConnection;

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

                const yTextContent = text?.toString?.() ?? '';
                const fragmentEmpty = !fragment || fragment.length === 0;
                console.log(`[Milkdown] collab connect: fragmentLen=${fragment?.length ?? 'null'} fragmentEmpty=${fragmentEmpty} yTextLen=${yTextContent.length} yText="${yTextContent.slice(0,60).replace(/\n/g,'↵')}"`);

                // Migrate: populate XmlFragment from Y.Text ONLY if the fragment is
                // truly empty (length === 0). Milkdown's default applyTemplate condition
                // checks textContent which incorrectly fires for non-text-only content
                // (images, file blocks) — so we add our own explicit guard here.
                if (yTextContent && fragmentEmpty) {
                    console.log(`[Milkdown] applyTemplate firing with "${yTextContent.slice(0,60).replace(/\n/g,'↵')}"`);
                    collabService.applyTemplate(yTextContent);
                }

                // Fallback: if ProseMirror is still empty AND XmlFragment was empty,
                // apply content directly via a ProseMirror transaction.
                // Only fires when applyTemplate was a no-op (e.g. async race) or the
                // markdown parser produced an empty doc.
                const view = ctx.get(editorViewCtx);
                console.log(`[Milkdown] after connect/applyTemplate: pmTextLen=${view?.state.doc.textContent.length ?? 'no view'} fragmentEmptyWas=${fragmentEmpty}`);
                if (view && view.state.doc.textContent.length === 0 && yTextContent && fragmentEmpty) {
                    console.log(`[Milkdown] fallback view.dispatch firing`);
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

        // No cleanup here — disconnect is handled by the Crepe init effect cleanup
        // on component unmount. Returning a cleanup function that calls disconnect()
        // causes a spurious disconnect+reconnect every time isConnected or ytextReady
        // changes (both are in the deps array), which can trigger double inserts into
        // XmlFragment and duplicate content.
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

    // ── Inline comments: selection detection ─────────────────────────────────
    // Fires onSelectionChange when user makes/clears a non-empty text selection.
    // The anchor is encoded as Y.RelativePosition (Buffer → base64) so it survives
    // concurrent edits from other collaborators — the key NoSQL/CRDT argument.
    const onSelectionChangeRef = useRef(onSelectionChange);
    useEffect(() => { onSelectionChangeRef.current = onSelectionChange; }, [onSelectionChange]);

    // ── Inject comment button into Crepe floating toolbar ────────────────────
    // Crepe toolbar has no public API for custom items, so we use MutationObserver
    // to detect when toolbar appears and inject a comment button.
    useEffect(() => {
        if (!isEditorReady || !onSelectionChange) return;
        const container = containerRef.current;
        if (!container) return;

        const injectButton = (toolbar: Element) => {
            if (toolbar.querySelector('.comment-btn-injected')) return;
            const btn = document.createElement('button');
            btn.className = 'toolbar-item comment-btn-injected';
            btn.title = 'Добавить комментарий';
            btn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`;
            btn.addEventListener('mousedown', (e) => {
                e.preventDefault(); // keep selection alive
                e.stopPropagation();
            });
            btn.addEventListener('click', () => {
                const domSel = window.getSelection();
                if (!domSel || domSel.isCollapsed) return;
                const selectedText = domSel.toString().trim();
                if (!selectedText) return;

                let encodedAnchor = '';
                try {
                    const editor = editorRef.current;
                    const fragment = sharedConnectionRef.current?.fragment;
                    if (editor && fragment) {
                        editor.action((ctx: Ctx) => {
                            const view = ctx.get(editorViewCtx);
                            if (!view) return;
                            const { from } = view.state.selection;
                            const syncState = ySyncPluginKey.getState(view.state);
                            const mapping = syncState?.binding?.mapping;
                            if (mapping !== undefined) {
                                const relPos = absolutePositionToRelativePosition(from, fragment, mapping);
                                encodedAnchor = uint8ToBase64(Y.encodeRelativePosition(relPos));
                            }
                        });
                    }
                } catch { /* no collab */ }

                if (!encodedAnchor) return;
                onSelectionChangeRef.current?.({
                    yjsAnchor: encodedAnchor,
                    anchorText: selectedText.slice(0, 200),
                });
            });
            toolbar.appendChild(btn);
        };

        const observer = new MutationObserver(() => {
            const toolbar = container.querySelector('.milkdown-toolbar');
            if (toolbar) injectButton(toolbar);
        });
        observer.observe(container, { childList: true, subtree: true });

        // Try immediately in case toolbar already exists
        const existing = container.querySelector('.milkdown-toolbar');
        if (existing) injectButton(existing);

        return () => observer.disconnect();
    }, [isEditorReady, onSelectionChange]);

    // ── Inline comments: selection detection ─────────────────────────────────
    // Attach directly to containerRef so it works regardless of Crepe internals.
    const sharedConnectionRef = useRef(sharedConnection);
    useEffect(() => { sharedConnectionRef.current = sharedConnection; }, [sharedConnection]);


    // ── Inline comments: scroll to anchor ────────────────────────────────────
    // Exposes scrollToAnchor(base64) via ref so EditorRightPanel can navigate
    // the editor to the position stored in the MongoDB yjsAnchor Buffer.
    useEffect(() => {
        if (!scrollToAnchorRef) return;

        scrollToAnchorRef.current = (base64: string, anchorText?: string | null) => {
            if (!isEditorReady || !sharedConnection?.doc || !sharedConnection?.fragment) return;
            const editor = editorRef.current;
            if (!editor) return;
            try {
                const bytes = base64ToUint8(base64);
                if (bytes.length === 0) {
                    console.warn('[scrollToAnchor] empty anchor bytes, skipping');
                    return;
                }
                const relPos = Y.decodeRelativePosition(bytes);
                editor.action((ctx: Ctx) => {
                    const view = ctx.get(editorViewCtx);
                    if (!view) return;
                    const syncState = ySyncPluginKey.getState(view.state);
                    const mapping = syncState?.binding?.mapping ?? syncState?.mapping ?? syncState?.doc?.mapping;
                    console.log('[scrollToAnchor] syncState:', JSON.stringify(Object.keys(syncState ?? {})), 'mapping type:', typeof mapping, 'mapping:', mapping);
                    if (!mapping) { console.warn('[scrollToAnchor] no mapping, syncState:', syncState); return; }
                    const absPos = relativePositionToAbsolutePosition(
                        sharedConnection!.doc,
                        sharedConnection!.fragment,
                        relPos,
                        mapping,
                    );
                    if (absPos == null) return;
                    const safePos = Math.min(Math.max(absPos, 1), view.state.doc.content.size);

                    // If we know the anchor text length, select it for a visible highlight
                    const endPos = anchorText
                        ? Math.min(safePos + anchorText.length, view.state.doc.content.size)
                        : safePos;
                    const sel = endPos > safePos
                        ? TextSelection.create(view.state.doc, safePos, endPos)
                        : TextSelection.near(view.state.doc.resolve(safePos));
                    view.dispatch(view.state.tr.setSelection(sel).scrollIntoView());
                    view.focus();
                    scrollEditorToCenter(view, safePos);

                    // Clear the highlight after 1.5s
                    if (endPos > safePos) {
                        setTimeout(() => {
                            try {
                                editor.action((ctx2: Ctx) => {
                                    const v = ctx2.get(editorViewCtx);
                                    if (!v) return;
                                    const cursor = TextSelection.near(v.state.doc.resolve(safePos));
                                    v.dispatch(v.state.tr.setSelection(cursor));
                                });
                            } catch { /* editor gone */ }
                        }, 1500);
                    }
                });
            } catch (err) {
                console.warn('[MilkdownEditor] scrollToAnchor failed:', err);
            }
        };

        return () => {
            if (scrollToAnchorRef) scrollToAnchorRef.current = null;
        };
    // Re-bind whenever collab state changes so the ref always has a fresh closure
    }, [isEditorReady, collabConnected, sharedConnection, scrollToAnchorRef]);

    // ── Scroll to heading by text ─────────────────────────────────────────────
    useEffect(() => {
        if (!scrollToHeadingRef) return;

        scrollToHeadingRef.current = (headingText: string) => {
            if (!isEditorReady) return;
            const editor = editorRef.current;
            if (!editor) return;
            try {
                editor.action((ctx: Ctx) => {
                    const view = ctx.get(editorViewCtx);
                    if (!view) return;
                    let targetPos: number | null = null;
                    view.state.doc.forEach((node, offset) => {
                        if (targetPos !== null) return;
                        if (node.type.name === 'heading' && node.textContent.trim() === headingText) {
                            targetPos = offset;
                        }
                    });
                    if (targetPos === null) return;
                    const safePos = Math.min(Math.max(targetPos + 1, 1), view.state.doc.content.size);
                    const sel = TextSelection.near(view.state.doc.resolve(safePos));
                    view.dispatch(view.state.tr.setSelection(sel).scrollIntoView());
                    view.focus();
                    scrollEditorToCenter(view, safePos);
                });
            } catch (err) {
                console.warn('[MilkdownEditor] scrollToHeading failed:', err);
            }
        };

        return () => {
            if (scrollToHeadingRef) scrollToHeadingRef.current = null;
        };
    }, [isEditorReady, scrollToHeadingRef]);

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
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                    // Prevent browser from opening the file in a new tab.
                    // ProseMirror plugin handles the actual upload.
                    if (e.dataTransfer?.files?.length) e.preventDefault();
                }}
                className={cx(
                    readOnly ? 'milkdown-readonly-container' : 'milkdown-editor-container',
                    styles.editorContainer,
                )}
            />
        </div>
    );
};
