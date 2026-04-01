import { useCallback, useEffect, useRef, useState } from 'react';
import * as Y from 'yjs';
import { createNoteConnection } from '@yjs/yjs-connector.js';
import { getToken as getTokenFromStorage } from '@utils/tokenStorage';
import { adjustCursorForDelta } from '@utils/cursorUtils';

type ConnectionType = {
  doc: any;
  provider: any;
  text: any;
  fragment: any;
  awareness: any;
  destroy: () => void;
};

type UseNoteYDocParams = {
  noteId: string;
  getToken?: () => string | null;
  enabled?: boolean;
  shareToken?: string | null;
};

type UseNoteYDocResult = {
  markdown: string;
  setMarkdown: (value: string) => void;
  isLoading: boolean;
  sharedConnection: {
    doc: any;
    provider: any;
    text: any;
    fragment: any;
    awareness: any;
  } | null;
  applyContentToYjs: (newContent: string, origin?: string) => void;
  registerTextareaRef: (el: HTMLTextAreaElement | null) => void;
  undo: () => void;
  redo: () => void;
};

/**
 * Хук, который:
 * - создаёт Yjs‑подключение к заметке;
 * - держит в React‑стейте plain‑markdown (для textarea/undo);
 * - даёт sharedConnection для Milkdown (doc/provider/text);
 * - отдаёт функцию applyContentToYjs для записи в Y.Text с диффом.
 *
 * Важно: хук ничего не знает про undo/redo — только синк Yjs <-> markdown.
 */
export const useNoteYDoc = ({
  noteId,
  getToken,
  enabled = true,
  shareToken,
}: UseNoteYDocParams): UseNoteYDocResult => {
  const [markdown, setMarkdown] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [sharedConnection, setSharedConnection] = useState<{
    doc: any;
    provider: any;
    text: any;
    fragment: any;
  } | null>(null);

  const connectionRef = useRef<ConnectionType | null>(null);
  const yTextRef = useRef<any>(null);
  const observerRef = useRef<((event: any) => void) | null>(null);
  const fragmentRef = useRef<any>(null);
  const textareaElRef = useRef<HTMLTextAreaElement | null>(null);
  const undoManagerRef = useRef<Y.UndoManager | null>(null);

  // Создание Yjs‑подключения и подписка на изменения текста
  useEffect(() => {
    if (!enabled) {
      setIsLoading(false);
      return;
    }

    const token = getToken ? getToken() : getTokenFromStorage();
    if (!token) {
      setIsLoading(false);
      return;
    }

    const connection = createNoteConnection({
      noteId,
      token: token || '',
      wsUrl: process.env.REACT_APP_WS_URL || undefined,
      shareToken: shareToken || null,
    }) as ConnectionType;

    connectionRef.current = connection;
    yTextRef.current = connection.text;
    fragmentRef.current = connection.fragment;

    setSharedConnection({
      doc: connection.doc,
      provider: connection.provider,
      text: connection.text,
      fragment: connection.fragment,
      awareness: connection.awareness,
    });

    const observer = (event: any) => {
      if (!yTextRef.current) return;
      const content = yTextRef.current.toString();
      const origin = event?.transaction?.origin;
      const isRemote = typeof origin !== 'string';

      const textarea = textareaElRef.current;
      if (isRemote && textarea && document.activeElement === textarea) {
        const oldStart = textarea.selectionStart;
        const oldEnd = textarea.selectionEnd;
        const scrollTop = textarea.scrollTop;
        const delta = event.delta || [];

        const newStart = adjustCursorForDelta(delta, oldStart);
        const newEnd = adjustCursorForDelta(delta, oldEnd);

        setMarkdown(content);
        setIsLoading(false);

        requestAnimationFrame(() => {
          if (textarea && document.activeElement === textarea) {
            textarea.setSelectionRange(newStart, newEnd);
            textarea.scrollTop = scrollTop;
          }
        });
        return;
      }

      setMarkdown(content);
      setIsLoading(false);
    };

    connection.text.observe(observer);
    observerRef.current = observer;

    const undoManager = new Y.UndoManager(connection.text, {
      trackedOrigins: new Set(['local', 'markdown-editor']),
    });
    undoManagerRef.current = undoManager;

    // начальное значение (может быть непустым если IDB уже загрузил)
    const initialContent = connection.text.toString();
    setMarkdown(initialContent);
    if (initialContent.length > 0) {
      setIsLoading(false);
    }

    // Ждём загрузки контента из IDB или WS sync
    const idb = (connection as any).idbPersistence;
    if (idb) {
      idb.on('synced', () => {
        if (connection.text && connection.text.toString().length > 0) {
          setIsLoading(false);
        }
      });
    }

    // Provider sync = сервер доставил своё состояние (даже для пустых заметок)
    connection.provider.on('sync', (isSynced: boolean) => {
      if (isSynced) {
        setIsLoading(false);
      }
    });

    // Таймаут-фолбэк на случай оффлайна / ошибки подключения
    const loadingTimeout = setTimeout(() => setIsLoading(false), 5000);

    return () => {
      clearTimeout(loadingTimeout);
      if (yTextRef.current && observerRef.current) {
        yTextRef.current.unobserve(observerRef.current);
      }
      observerRef.current = null;
      yTextRef.current = null;
      fragmentRef.current = null;
      undoManagerRef.current?.destroy();
      undoManagerRef.current = null;

      if (connectionRef.current) {
        connectionRef.current.destroy();
        connectionRef.current = null;
      }
    };
  }, [noteId, getToken, enabled]);

  // Запись в Y.Text с минимальным диффом
  const applyContentToYjs = useCallback((newContent: string, origin: string = 'local') => {
    const text = yTextRef.current;
    if (!text) return;

    const current = text.toString();
    if (current === newContent) {
      return;
    }

    const doc = text.doc;
    if (!doc) return;

    let start = 0;
    const prevLength = current.length;
    const nextLength = newContent.length;

    while (start < prevLength && start < nextLength && current[start] === newContent[start]) {
      start += 1;
    }

    let endPrev = prevLength;
    let endNext = nextLength;
    while (endPrev > start && endNext > start && current[endPrev - 1] === newContent[endNext - 1]) {
      endPrev -= 1;
      endNext -= 1;
    }

    const deleteCount = endPrev - start;
    const insertText = newContent.slice(start, endNext);

    doc.transact(() => {
      if (deleteCount > 0) {
        text.delete(start, deleteCount);
      }
      if (insertText.length > 0) {
        text.insert(start, insertText);
      }
    }, origin || 'markdown-editor');
  }, []);

  const undo = useCallback(() => { undoManagerRef.current?.undo(); }, []);
  const redo = useCallback(() => { undoManagerRef.current?.redo(); }, []);

  return {
    markdown,
    setMarkdown,
    isLoading,
    sharedConnection,
    applyContentToYjs,
    registerTextareaRef: (el: HTMLTextAreaElement | null) => {
      textareaElRef.current = el;
    },
    undo,
    redo,
  };
};

