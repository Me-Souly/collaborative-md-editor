import React, { forwardRef, useRef } from 'react';
import { TextareaCursors } from '@components/notes/components/TextareaCursors';
import { type RemoteCursorState } from '@hooks/useAwareness';
import * as styles from '@components/notes/NoteViewer.module.css';

interface EditorTextareaProps {
    value: string;
    onChange: (value: string) => void;
    onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
    isLoading: boolean;
    placeholder?: string;
    remoteCursors?: RemoteCursorState[];
    broadcastCursor?: (anchor: number, head: number) => void;
    clearCursor?: () => void;
}

export const EditorTextarea = forwardRef<HTMLTextAreaElement, EditorTextareaProps>(
    (
        {
            value,
            onChange,
            onKeyDown,
            isLoading: _isLoading,
            placeholder = 'Start writing...',
            remoteCursors,
            broadcastCursor,
            clearCursor,
        },
        ref,
    ) => {
        const internalRef = useRef<HTMLTextAreaElement | null>(null);

        const setRef = (el: HTMLTextAreaElement | null) => {
            internalRef.current = el;
            if (typeof ref === 'function') ref(el);
            else if (ref) (ref as React.MutableRefObject<HTMLTextAreaElement | null>).current = el;
        };

        const handleCursorBroadcast = () => {
            const el = internalRef.current;
            if (!el || !broadcastCursor) return;
            broadcastCursor(el.selectionStart, el.selectionEnd);
        };

        return (
            <div className={styles.leftPane} style={{ position: 'relative' }}>
                <textarea
                    ref={setRef}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    onKeyDown={onKeyDown}
                    onKeyUp={handleCursorBroadcast}
                    onSelect={handleCursorBroadcast}
                    onClick={handleCursorBroadcast}
                    onBlur={clearCursor}
                    className={styles.markdownTextarea}
                    placeholder={placeholder}
                />
                {remoteCursors && remoteCursors.length > 0 && (
                    <TextareaCursors textarea={internalRef} cursors={remoteCursors} />
                )}
            </div>
        );
    },
);

EditorTextarea.displayName = 'EditorTextarea';
