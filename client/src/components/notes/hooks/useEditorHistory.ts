import { useState, useRef, useCallback } from 'react';

const MAX_HISTORY = 200;

export const useEditorHistory = (initialMarkdown: string = '') => {
  const [history, setHistory] = useState<string[]>([]);
  const [redoStack, setRedoStack] = useState<string[]>([]);
  const historyInitializedRef = useRef(false);
  const historyDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const historyDebounceResetRedoRef = useRef(false);
  const markdownRef = useRef(initialMarkdown);

  const initializeHistory = useCallback((markdown: string) => {
    if (!historyInitializedRef.current) {
      historyInitializedRef.current = true;
      if (markdown && markdown.length > 0) {
        setHistory([markdown]);
      } else {
        setHistory([]);
      }
      setRedoStack([]);
    }
  }, []);

  const pushToHistory = useCallback((value: string) => {
    setHistory(prev => {
      if (prev.length > 0 && prev[prev.length - 1] === value) {
        return prev;
      }
      const next = [...prev, value];
      if (next.length > MAX_HISTORY) {
        next.shift();
      }
      return next;
    });
  }, []);

  const flushHistoryDebounce = useCallback(() => {
    if (!historyDebounceRef.current) return;
    clearTimeout(historyDebounceRef.current);
    historyDebounceRef.current = null;
    pushToHistory(markdownRef.current);
    if (historyDebounceResetRedoRef.current) {
      setRedoStack([]);
    }
    historyDebounceResetRedoRef.current = false;
  }, [pushToHistory]);

  const scheduleHistoryPush = useCallback(
    (value: string, resetRedo: boolean = false) => {
      if (historyDebounceRef.current) {
        clearTimeout(historyDebounceRef.current);
      }
      historyDebounceResetRedoRef.current = resetRedo;
      historyDebounceRef.current = setTimeout(() => {
        pushToHistory(value);
        if (resetRedo) {
          setRedoStack([]);
        }
        historyDebounceRef.current = null;
        historyDebounceResetRedoRef.current = false;
      }, 900);
    },
    [pushToHistory]
  );

  const updateMarkdownRef = useCallback((markdown: string) => {
    markdownRef.current = markdown;
  }, []);

  return {
    history,
    redoStack,
    initializeHistory,
    pushToHistory,
    flushHistoryDebounce,
    scheduleHistoryPush,
    updateMarkdownRef,
    setHistory,
    setRedoStack,
  };
};

