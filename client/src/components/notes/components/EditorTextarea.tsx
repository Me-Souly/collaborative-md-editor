import React, { forwardRef } from 'react';
import * as styles from '@components/notes/NoteViewer.module.css';

interface EditorTextareaProps {
    value: string;
    onChange: (value: string) => void;
    onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
    isLoading: boolean;
    placeholder?: string;
}

export const EditorTextarea = forwardRef<HTMLTextAreaElement, EditorTextareaProps>(
    (
        { value, onChange, onKeyDown, isLoading: _isLoading, placeholder = 'Start writing...' },
        ref,
    ) => {
        return (
            <div className={styles.leftPane}>
                <textarea
                    ref={ref}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    onKeyDown={onKeyDown}
                    className={styles.markdownTextarea}
                    placeholder={placeholder}
                />
            </div>
        );
    },
);

EditorTextarea.displayName = 'EditorTextarea';
