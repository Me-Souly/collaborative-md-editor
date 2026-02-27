import React from 'react';
import {
    BoldIcon,
    ItalicIcon,
    StrikethroughIcon,
    Heading1Icon,
    Heading2Icon,
    Heading3Icon,
    LinkIcon,
    CodeIcon,
    ListIcon,
    ListOrderedIcon,
    QuoteIcon,
    ImageIcon,
    MessageSquareIcon,
    SparklesIcon,
    EyeOffIcon,
    Columns2Icon,
    AlignLeftIcon,
} from '@components/common/ui/icons';
import * as styles from '@components/notes/NoteViewer.module.css';

type PreviewMode = 'split' | 'edit' | 'preview';
type RightPanel = 'comments' | 'ai' | null;

interface EditorToolbarProps {
    onInsertMarkdown: (prefix: string, suffix?: string) => void;
    previewMode: PreviewMode;
    onPreviewModeChange: (mode: PreviewMode) => void;
    rightPanel: RightPanel;
    onToggleComments: () => void;
    onToggleAI: () => void;
}

const ToolbarBtn: React.FC<{
    title: string;
    active?: boolean;
    onClick: () => void;
    children: React.ReactNode;
    extraClass?: string;
}> = ({ title, active, onClick, children, extraClass }) => (
    <button
        title={title}
        onClick={onClick}
        className={`${styles.toolbarButton} ${active ? styles.toolbarButtonActive : ''} ${extraClass ?? ''}`}
    >
        {children}
    </button>
);

const Sep: React.FC = () => <div className={styles.toolbarSeparator} />;

export const EditorToolbar: React.FC<EditorToolbarProps> = ({
    onInsertMarkdown,
    previewMode,
    onPreviewModeChange,
    rightPanel,
    onToggleComments,
    onToggleAI,
}) => {
    return (
        <div className={styles.toolbar}>
            {/* ── Formatting ── */}
            <div className={styles.toolbarLeft}>
                <ToolbarBtn title="Bold" onClick={() => onInsertMarkdown('**', '**')}>
                    <BoldIcon className={styles.toolbarIcon} />
                </ToolbarBtn>
                <ToolbarBtn title="Italic" onClick={() => onInsertMarkdown('_', '_')}>
                    <ItalicIcon className={styles.toolbarIcon} />
                </ToolbarBtn>
                <ToolbarBtn title="Strikethrough" onClick={() => onInsertMarkdown('~~', '~~')}>
                    <StrikethroughIcon className={styles.toolbarIcon} />
                </ToolbarBtn>

                <Sep />

                <ToolbarBtn title="Heading 1" onClick={() => onInsertMarkdown('# ')}>
                    <Heading1Icon className={styles.toolbarIcon} />
                </ToolbarBtn>
                <ToolbarBtn title="Heading 2" onClick={() => onInsertMarkdown('## ')}>
                    <Heading2Icon className={styles.toolbarIcon} />
                </ToolbarBtn>
                <ToolbarBtn title="Heading 3" onClick={() => onInsertMarkdown('### ')}>
                    <Heading3Icon className={styles.toolbarIcon} />
                </ToolbarBtn>

                <Sep />

                <ToolbarBtn title="Unordered list" onClick={() => onInsertMarkdown('- ')}>
                    <ListIcon className={styles.toolbarIcon} />
                </ToolbarBtn>
                <ToolbarBtn title="Ordered list" onClick={() => onInsertMarkdown('1. ')}>
                    <ListOrderedIcon className={styles.toolbarIcon} />
                </ToolbarBtn>

                <Sep />

                <ToolbarBtn title="Inline code" onClick={() => onInsertMarkdown('`', '`')}>
                    <CodeIcon className={styles.toolbarIcon} />
                </ToolbarBtn>
                <ToolbarBtn
                    title="Code block"
                    extraClass={styles.toolbarBtnCode}
                    onClick={() => onInsertMarkdown('```\n', '\n```')}
                >
                    {'```'}
                </ToolbarBtn>

                <Sep />

                <ToolbarBtn title="Blockquote" onClick={() => onInsertMarkdown('> ')}>
                    <QuoteIcon className={styles.toolbarIcon} />
                </ToolbarBtn>

                <Sep />

                <ToolbarBtn title="Link" onClick={() => onInsertMarkdown('[', '](url)')}>
                    <LinkIcon className={styles.toolbarIcon} />
                </ToolbarBtn>
                <ToolbarBtn title="Image" onClick={() => onInsertMarkdown('![alt](', ')')}>
                    <ImageIcon className={styles.toolbarIcon} />
                </ToolbarBtn>
            </div>

            {/* ── Spacer ── */}
            <div style={{ flex: 1 }} />

            {/* ── View mode pill ── */}
            <div className={styles.viewModePill}>
                <button
                    className={`${styles.viewModePillBtn} ${previewMode === 'edit' ? styles.viewModePillBtnActive : ''}`}
                    onClick={() => onPreviewModeChange('edit')}
                    title="Raw markdown"
                >
                    <EyeOffIcon className={styles.toolbarIcon} />
                </button>
                <button
                    className={`${styles.viewModePillBtn} ${previewMode === 'split' ? styles.viewModePillBtnActive : ''}`}
                    onClick={() => onPreviewModeChange('split')}
                    title="Split view"
                >
                    <Columns2Icon className={styles.toolbarIcon} />
                </button>
                <button
                    className={`${styles.viewModePillBtn} ${previewMode === 'preview' ? styles.viewModePillBtnActive : ''}`}
                    onClick={() => onPreviewModeChange('preview')}
                    title="Preview"
                >
                    <AlignLeftIcon className={styles.toolbarIcon} />
                </button>
            </div>

            <Sep />

            {/* ── Right panel toggles ── */}
            <div className={styles.toolbarRight}>
                <ToolbarBtn
                    title="Comments"
                    active={rightPanel === 'comments'}
                    onClick={onToggleComments}
                >
                    <MessageSquareIcon className={styles.toolbarIcon} />
                </ToolbarBtn>
                <ToolbarBtn
                    title="AI Assistant"
                    active={rightPanel === 'ai'}
                    onClick={onToggleAI}
                >
                    <SparklesIcon className={styles.toolbarIcon} />
                </ToolbarBtn>
            </div>
        </div>
    );
};
