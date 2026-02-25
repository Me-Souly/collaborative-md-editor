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
    EyeIcon,
    EyeOffIcon,
    MaximizeIcon,
} from '@components/common/ui/icons';
import * as styles from '@components/notes/NoteViewer.module.css';

const cn = (...classes: (string | undefined | false)[]) => classes.filter(Boolean).join(' ');

type PreviewMode = 'split' | 'edit' | 'preview';

interface EditorToolbarProps {
    previewMode: PreviewMode;
    onPreviewModeChange: (mode: PreviewMode) => void;
    onInsertMarkdown: (prefix: string, suffix?: string) => void;
}

export const EditorToolbar: React.FC<EditorToolbarProps> = ({
    previewMode,
    onPreviewModeChange,
    onInsertMarkdown,
}) => {
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
            <div className={styles.toolbarRight}>
                <button
                    className={cn(
                        styles.toolbarButton,
                        previewMode === 'edit' && styles.toolbarButtonActive,
                    )}
                    onClick={() => onPreviewModeChange('edit')}
                    title="Edit Mode"
                >
                    <EyeOffIcon className={styles.toolbarIcon} />
                </button>
                <button
                    className={cn(
                        styles.toolbarButton,
                        previewMode === 'split' && styles.toolbarButtonActive,
                    )}
                    onClick={() => onPreviewModeChange('split')}
                    title="Split Mode"
                >
                    <MaximizeIcon className={styles.toolbarIcon} />
                </button>
                <button
                    className={cn(
                        styles.toolbarButton,
                        previewMode === 'preview' && styles.toolbarButtonActive,
                    )}
                    onClick={() => onPreviewModeChange('preview')}
                    title="Preview Mode"
                >
                    <EyeIcon className={styles.toolbarIcon} />
                </button>
            </div>
        </div>
    );
};
