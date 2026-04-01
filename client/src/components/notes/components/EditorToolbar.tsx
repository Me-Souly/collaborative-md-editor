import React from 'react';
import {
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
    previewMode: PreviewMode;
    onPreviewModeChange: (mode: PreviewMode) => void;
    rightPanel: RightPanel;
    onToggleComments: () => void;
    onToggleAI: () => void;
    isMobile?: boolean;
}

const ToolbarBtn: React.FC<{
    title: string;
    active?: boolean;
    onClick: () => void;
    children: React.ReactNode;
}> = ({ title, active, onClick, children }) => (
    <button
        title={title}
        onClick={onClick}
        className={`${styles.toolbarButton} ${active ? styles.toolbarButtonActive : ''}`}
    >
        {children}
    </button>
);

const Sep: React.FC = () => <div className={styles.toolbarSeparator} />;

export const EditorToolbar: React.FC<EditorToolbarProps> = ({
    previewMode,
    onPreviewModeChange,
    rightPanel,
    onToggleComments,
    onToggleAI,
    isMobile,
}) => {
    const viewModePill = (
        <div className={styles.viewModePill}>
            <button
                className={`${styles.viewModePillBtn} ${previewMode === 'preview' ? styles.viewModePillBtnActive : ''}`}
                onClick={() => onPreviewModeChange('preview')}
                title="Preview"
            >
                <AlignLeftIcon className={styles.toolbarIcon} />
            </button>
            {!isMobile && (
                <button
                    className={`${styles.viewModePillBtn} ${previewMode === 'split' ? styles.viewModePillBtnActive : ''}`}
                    onClick={() => onPreviewModeChange('split')}
                    title="Split view"
                >
                    <Columns2Icon className={styles.toolbarIcon} />
                </button>
            )}
            <button
                className={`${styles.viewModePillBtn} ${previewMode === 'edit' ? styles.viewModePillBtnActive : ''}`}
                onClick={() => onPreviewModeChange('edit')}
                title="Raw markdown"
            >
                <EyeOffIcon className={styles.toolbarIcon} />
            </button>
        </div>
    );

    const panelToggles = (
        <>
            <ToolbarBtn
                title="Comments"
                active={rightPanel === 'comments'}
                onClick={onToggleComments}
            >
                <MessageSquareIcon className={styles.toolbarIcon} />
            </ToolbarBtn>
            <ToolbarBtn title="AI Assistant" active={rightPanel === 'ai'} onClick={onToggleAI}>
                <SparklesIcon className={styles.toolbarIcon} />
            </ToolbarBtn>
        </>
    );

    return (
        <div className={styles.toolbar}>
            <div style={{ flex: 1 }} />
            {viewModePill}
            <Sep />
            <div className={styles.toolbarRight}>{panelToggles}</div>
        </div>
    );
};
