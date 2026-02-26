import React from 'react';
import {
    BoldIcon,
    ItalicIcon,
    LinkIcon,
    CodeIcon,
    ListIcon,
    ListOrderedIcon,
    QuoteIcon,
    ImageIcon,
} from '@components/common/ui/icons';
import * as styles from '@components/notes/NoteViewer.module.css';

interface EditorToolbarProps {
    onInsertMarkdown: (prefix: string, suffix?: string) => void;
}

export const EditorToolbar: React.FC<EditorToolbarProps> = ({ onInsertMarkdown }) => {
    return (
        <div className={styles.toolbar}>
            <div className={styles.toolbarLeft}>
                <button
                    className={styles.toolbarButton}
                    onClick={() => onInsertMarkdown('**', '**')}
                    title="Bold"
                >
                    <BoldIcon className={styles.toolbarIcon} />
                </button>
                <button
                    className={styles.toolbarButton}
                    onClick={() => onInsertMarkdown('_', '_')}
                    title="Italic"
                >
                    <ItalicIcon className={styles.toolbarIcon} />
                </button>
                <button
                    className={styles.toolbarButton}
                    onClick={() => onInsertMarkdown('[', '](url)')}
                    title="Link"
                >
                    <LinkIcon className={styles.toolbarIcon} />
                </button>
                <button
                    className={styles.toolbarButton}
                    onClick={() => onInsertMarkdown('`', '`')}
                    title="Code"
                >
                    <CodeIcon className={styles.toolbarIcon} />
                </button>
                <div className={styles.toolbarSeparator} />
                <button
                    className={styles.toolbarButton}
                    onClick={() => onInsertMarkdown('- ')}
                    title="Unordered List"
                >
                    <ListIcon className={styles.toolbarIcon} />
                </button>
                <button
                    className={styles.toolbarButton}
                    onClick={() => onInsertMarkdown('1. ')}
                    title="Ordered List"
                >
                    <ListOrderedIcon className={styles.toolbarIcon} />
                </button>
                <button
                    className={styles.toolbarButton}
                    onClick={() => onInsertMarkdown('> ')}
                    title="Quote"
                >
                    <QuoteIcon className={styles.toolbarIcon} />
                </button>
                <div className={styles.toolbarSeparator} />
                <button
                    className={styles.toolbarButton}
                    onClick={() => onInsertMarkdown('![alt](', ')')}
                    title="Image"
                >
                    <ImageIcon className={styles.toolbarIcon} />
                </button>
            </div>
        </div>
    );
};
