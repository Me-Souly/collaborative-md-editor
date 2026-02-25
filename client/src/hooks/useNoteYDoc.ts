import { useCallback, useEffect, useRef, useState } from 'react';
import { createNoteConnection } from '@yjs/yjs-connector.js';
import { getToken as getTokenFromStorage } from '@utils/tokenStorage';

type ConnectionType = {
  doc: any;
  provider: any;
  text: any;
  fragment: any;
  destroy: () => void;
};

type UseNoteYDocParams = {
  noteId: string;
  getToken?: () => string | null;
  enabled?: boolean;
  initialMarkdown?: string;
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
  } | null;
  applyContentToYjs: (newContent: string, origin?: string) => void;
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
  initialMarkdown,
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
  const observerRef = useRef<(() => void) | null>(null);
  const fragmentRef = useRef<any>(null);

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
      wsUrl: process.env.REACT_APP_WS_URL || 'ws://localhost:5000',
    }) as ConnectionType;

    connectionRef.current = connection;
    yTextRef.current = connection.text;
    fragmentRef.current = connection.fragment;

    setSharedConnection({
      doc: connection.doc,
      provider: connection.provider,
      text: connection.text,
      fragment: connection.fragment,
    });

    // Если есть initialMarkdown и текст пуст — запишем его сразу,
    // чтобы не было пустого состояния до синка.
    if (initialMarkdown && connection.text && connection.text.toString().length === 0) {
      try {
        connection.text.insert(0, initialMarkdown);
      } catch (e) {
        console.error('[useNoteYDoc] Failed to apply initialMarkdown', e);
      }
    }

    const updateMarkdown = () => {
      if (!yTextRef.current) return;
      const content = yTextRef.current.toString();
      setMarkdown(content);
      setIsLoading(false);
    };

    const observer = () => updateMarkdown();
    connection.text.observe(observer);
    observerRef.current = observer;

    // начальное значение
    updateMarkdown();

    return () => {
      if (yTextRef.current && observerRef.current) {
        yTextRef.current.unobserve(observerRef.current);
      }
      observerRef.current = null;
      yTextRef.current = null;
      fragmentRef.current = null;

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
    // Для undo/redo всегда применяем изменения, даже если контент кажется одинаковым
    // (т.к. может быть рассинхронизация между Yjs и React state)
    if (current === newContent && origin !== 'undo-redo') {
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

    // Для undo/redo принудительно применяем изменения, даже если diff пустой
    // (это гарантирует, что Yjs observer сработает и обновит Milkdown)
    if (origin === 'undo-redo' && deleteCount === 0 && insertText.length === 0 && current !== newContent) {
      // Если контент отличается, но diff пустой (редкий случай) - делаем полную замену
      doc.transact(() => {
        if (current.length > 0) {
          text.delete(0, current.length);
        }
        if (newContent.length > 0) {
          text.insert(0, newContent);
        }
      }, origin);
    } else {
      doc.transact(() => {
        if (deleteCount > 0) {
          text.delete(start, deleteCount);
        }
        if (insertText.length > 0) {
          text.insert(start, insertText);
        }
      }, origin || 'markdown-editor');
    }
  }, []);

  return {
    markdown,
    setMarkdown,
    isLoading,
    sharedConnection,
    applyContentToYjs,
  };
};

