import React from 'react';
import { MilkdownEditor } from '@components/notes/MilkdownEditor';
import { SplitEditNote } from '@components/notes/SplitEditNote';
import * as styles from '@components/notes/NoteViewer.module.css';

const cx = (...classes: (string | undefined | false)[]) => classes.filter(Boolean).join(' ');

type NoteViewerProps = {
    noteId: string;
    permission: 'edit' | 'read';
    getToken?: () => string | null;
    className?: string;
    initialMarkdown?: string;
    ownerId?: string;
    isPublic?: boolean;
};

// Компонент только для чтения (fullscreen preview)
export const ReadNote: React.FC<{
    noteId: string;
    getToken?: () => string | null;
    className?: string;
    initialMarkdown?: string;
    ownerId?: string;
    isPublic?: boolean;
}> = ({ noteId, getToken, className, initialMarkdown }) => {
    return (
        <div className={cx(styles.viewer, className)}>
            <MilkdownEditor
                key={`read-only-${noteId}`}
                noteId={noteId}
                readOnly={true}
                getToken={getToken}
                className={className}
                initialMarkdown={initialMarkdown}
            />
        </div>
    );
};

// Обёртка, которая выбирает нужный режим по permission
export const NoteViewer: React.FC<NoteViewerProps> = ({
    noteId,
    permission,
    getToken,
    className,
    initialMarkdown,
    ownerId,
    isPublic = false,
}) => {
    if (!permission) {
        return null;
    }

    if (permission === 'read') {
        return (
            <ReadNote
                key={`read-${noteId}`}
                noteId={noteId}
                getToken={getToken}
                className={className}
                initialMarkdown={initialMarkdown}
                ownerId={ownerId}
                isPublic={isPublic}
            />
        );
    }

    return (
        <SplitEditNote
            key={`edit-${noteId}`}
            noteId={noteId}
            getToken={getToken}
            className={className}
            initialMarkdown={initialMarkdown}
            ownerId={ownerId}
            isPublic={isPublic}
        />
    );
};
