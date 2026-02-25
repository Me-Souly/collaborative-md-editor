import { useCallback, useRef } from 'react';

interface UseUndoRedoProps {
    history: string[];
    redoStack: string[];
    setHistory: React.Dispatch<React.ReactSetStateAction<string[]>>;
    setRedoStack: React.Dispatch<React.ReactSetStateAction<string[]>>;
    setMarkdown: (value: string) => void;
    applyContentToYjs: (content: string, origin?: string) => void;
    flushHistoryDebounce: () => void;
}

export const useUndoRedo = ({
    history: _history,
    redoStack: _redoStack,
    setHistory,
    setRedoStack,
    setMarkdown,
    applyContentToYjs,
    flushHistoryDebounce,
}: UseUndoRedoProps) => {
    const isUndoRedoInProgressRef = useRef(false);
    const historyDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const handleUndo = useCallback(() => {
        flushHistoryDebounce();
        isUndoRedoInProgressRef.current = true;

        setHistory((prev) => {
            if (prev.length === 0) {
                isUndoRedoInProgressRef.current = false;
                return prev;
            }

            if (prev.length === 1) {
                const initialState = prev[0];
                setMarkdown(initialState);
                applyContentToYjs(initialState, 'undo-redo');
                setTimeout(() => {
                    isUndoRedoInProgressRef.current = false;
                }, 100);
                return prev;
            }

            const current = prev[prev.length - 1];
            const nextHistory = prev.slice(0, -1);
            const previous = nextHistory[nextHistory.length - 1] ?? '';

            setRedoStack((stack) => [current, ...stack]);
            setMarkdown(previous);
            applyContentToYjs(previous, 'undo-redo');

            setTimeout(() => {
                isUndoRedoInProgressRef.current = false;
            }, 100);

            return nextHistory;
        });
    }, [applyContentToYjs, flushHistoryDebounce, setMarkdown, setHistory, setRedoStack]);

    const handleRedo = useCallback(() => {
        isUndoRedoInProgressRef.current = true;

        setRedoStack((prev) => {
            if (prev.length === 0) {
                isUndoRedoInProgressRef.current = false;
                return prev;
            }

            const [nextContent, ...rest] = prev;

            setMarkdown(nextContent);
            applyContentToYjs(nextContent, 'undo-redo');

            setHistory((hist) => {
                return [...hist, nextContent];
            });

            if (historyDebounceRef.current) {
                clearTimeout(historyDebounceRef.current);
                historyDebounceRef.current = null;
            }

            setTimeout(() => {
                isUndoRedoInProgressRef.current = false;
            }, 100);

            return rest;
        });
    }, [applyContentToYjs, setMarkdown, setHistory, setRedoStack]);

    return {
        handleUndo,
        handleRedo,
        isUndoRedoInProgressRef,
    };
};
