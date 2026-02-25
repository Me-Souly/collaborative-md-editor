import { useCallback, useRef } from 'react';
import { Ctx, parserCtx, editorViewCtx } from '@milkdown/core';

const findScrollContainer = (node: HTMLElement | null): HTMLElement | null => {
    if (!node) return null;
    const preview = node.closest('.previewScroll') as HTMLElement | null;
    if (preview) return preview;
    const editorContainer = node.closest('.editorContainer') as HTMLElement | null;
    if (editorContainer) return editorContainer;
    let parent = node.parentElement;
    while (parent && parent !== document.body) {
        const style = window.getComputedStyle(parent);
        if (
            style.overflow === 'auto' ||
            style.overflow === 'scroll' ||
            style.overflowY === 'auto' ||
            style.overflowY === 'scroll'
        ) {
            return parent;
        }
        parent = parent.parentElement;
    }
    return null;
};

interface UseMarkdownSyncProps {
    editorRef: React.MutableRefObject<any>;
    effectiveReadOnly: boolean;
    onContentChange?: (content: string, meta?: { origin?: 'milkdown' | 'sync' }) => void;
    updateYText: (markdown: string, origin?: string) => void;
}

export const useMarkdownSync = ({
    editorRef,
    effectiveReadOnly,
    onContentChange,
    updateYText: _updateYText,
}: UseMarkdownSyncProps) => {
    const applyingRemoteRef = useRef(false);
    const initialApplyDoneRef = useRef(false);

    const applyMarkdownToEditor = useCallback(
        (
            markdown: string,
            {
                preserveSelection = false,
                addToHistory = false,
            }: { preserveSelection?: boolean; addToHistory?: boolean } = {},
        ) => {
            const editor = editorRef.current;
            if (!editor) return;

            try {
                editor.action((ctx: Ctx) => {
                    // Проверяем наличие parser в контексте перед использованием
                    let parser;
                    try {
                        parser = ctx.get(parserCtx);
                    } catch {
                        // Parser еще не инициализирован, пропускаем
                        console.warn(
                            '[useMarkdownSync] Parser not ready yet, skipping markdown apply',
                        );
                        return;
                    }

                    const view = ctx.get(editorViewCtx);
                    if (!parser || !view) {
                        return;
                    }

                    const doc = parser(markdown);
                    if (!doc) {
                        return;
                    }

                    let savedScrollTop: number | null = null;
                    let scrollContainer: HTMLElement | null = null;
                    if (effectiveReadOnly) {
                        scrollContainer = findScrollContainer(view.dom as HTMLElement);
                        if (scrollContainer) {
                            savedScrollTop = scrollContainer.scrollTop;
                        }
                    }

                    // Используем мета-данные для предотвращения конфликтов с y-prosemirror
                    const tr = view.state.tr.replaceWith(
                        0,
                        view.state.doc.content.size,
                        doc.content,
                    );
                    tr.setMeta('addToHistory', addToHistory);
                    // Указываем, что это изменение из markdown, а не из y-prosemirror
                    tr.setMeta('origin', 'markdown-editor');

                    if (preserveSelection) {
                        const { from, to } = view.state.selection;
                        const maxPos = tr.doc.content.size;
                        const validFrom = Math.min(from, maxPos);
                        const validTo = Math.min(to, maxPos);
                        const { TextSelection } = require('prosemirror-state');
                        tr.setSelection(TextSelection.create(tr.doc, validFrom, validTo));
                    }

                    view.dispatch(tr);

                    if (effectiveReadOnly && scrollContainer && savedScrollTop !== null) {
                        requestAnimationFrame(() => {
                            scrollContainer!.scrollTop = savedScrollTop!;
                        });
                    }
                });
            } catch (error) {
                // Редактор еще не готов или был уничтожен, игнорируем ошибку
                console.warn('[useMarkdownSync] Editor not ready or destroyed:', error);
            }
        },
        [editorRef, effectiveReadOnly],
    );

    const setupYTextObserver = useCallback(
        (yText: any, editor: any) => {
            const observer = (event: any) => {
                const origin = event?.transaction?.origin;
                // Пропускаем только собственные изменения редактора,
                // а изменения из textarea/Y.Text (origin = 'local' или 'yjs') применяем.
                if (
                    origin === 'milkdown' ||
                    origin === 'markdown-editor' ||
                    origin === 'y-prosemirror'
                )
                    return;
                if (applyingRemoteRef.current) return;

                let editorFocused = false;
                try {
                    if (!editor || !editor.action) return;
                    editor.action((ctx: Ctx) => {
                        try {
                            const view = ctx.get(editorViewCtx);
                            if (view) {
                                editorFocused =
                                    view.hasFocus() || document.activeElement === view.dom;
                            }
                        } catch {
                            // Editor context not ready
                        }
                    });
                } catch {
                    // Editor not ready, skip
                    return;
                }
                // Не применяем изменения, если редактор в фокусе
                if (editorFocused) return;

                const markdown = yText?.toString?.() ?? '';

                // ИСПРАВЛЕНИЕ: Применяем даже пустой markdown, чтобы preview синхронизировался
                // когда пользователь удаляет весь текст
                applyingRemoteRef.current = true;
                applyMarkdownToEditor(markdown, { addToHistory: false, preserveSelection: false });
                applyingRemoteRef.current = false;
                onContentChange?.(markdown, { origin: 'sync' });
            };

            yText?.observe(observer);
            return observer;
        },
        [applyMarkdownToEditor, onContentChange],
    );

    const applyInitialMarkdown = useCallback(
        (markdown: string, editor: any) => {
            if (!initialApplyDoneRef.current && markdown && editor) {
                // Проверяем, что редактор еще существует и готов
                if (!editor || !editor.action) {
                    return;
                }
                applyingRemoteRef.current = true;
                try {
                    applyMarkdownToEditor(markdown, {
                        addToHistory: false,
                        preserveSelection: false,
                    });
                } catch (error) {
                    console.warn('[useMarkdownSync] Failed to apply initial markdown:', error);
                } finally {
                    applyingRemoteRef.current = false;
                    initialApplyDoneRef.current = true;
                }
            }
        },
        [applyMarkdownToEditor],
    );

    return {
        applyMarkdownToEditor,
        setupYTextObserver,
        applyInitialMarkdown,
        applyingRemoteRef,
        initialApplyDoneRef,
    };
};
