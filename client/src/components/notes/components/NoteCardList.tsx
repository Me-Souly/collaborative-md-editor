import React, { useState } from 'react';
import { FileTextIcon, GlobeIcon, BanIcon, FolderIcon } from '@components/common/ui/icons';
import { NoteCardMenu } from '@components/notes/components/NoteCardMenu';
import { formatNoteDate } from '@components/notes/utils';
import * as styles from '@components/notes/NoteCard.module.css';

const cn = (...classes: (string | undefined | false)[]) => classes.filter(Boolean).join(' ');

interface NoteCardListProps {
    note: {
        id: string;
        title: string;
        excerpt?: string;
        rendered?: string;
        searchableContent?: string;
        updatedAt: string;
        isFavorite?: boolean;
        isShared?: boolean;
    };
    isPublic: boolean;
    readOnly: boolean;
    showBlockButton: boolean;
    staggerIndex?: number;
    folderPath?: string;
    onCardClick: () => void;
    onBlock?: (noteId: string) => void;
    onTogglePublic: (e: React.MouseEvent) => void;
    onRename: (e: React.MouseEvent) => void;
    onCreateSubnote: (e: React.MouseEvent) => void;
    onDelete: (e: React.MouseEvent) => void;
}

export const NoteCardList: React.FC<NoteCardListProps> = ({
    note,
    isPublic,
    readOnly,
    showBlockButton,
    staggerIndex = 0,
    folderPath,
    onCardClick,
    onBlock,
    onTogglePublic,
    onRename,
    onCreateSubnote,
    onDelete,
}) => {
    const [menuOpen, setMenuOpen] = useState(false);

    return (
        <div
            className={cn(styles.noteRow, styles.cardAnimate, menuOpen && styles.noteCardMenuOpen)}
            style={{ animationDelay: `${staggerIndex * 40}ms` }}
            onClick={onCardClick}
        >
            <FileTextIcon className={styles.rowIcon} />

            <span className={styles.noteTitle}>{note.title || 'Untitled'}</span>

            {folderPath && (
                <span className={styles.folderPath}>
                    <FolderIcon className={styles.folderPathIcon} />
                    {folderPath.split('›').map((part, i, arr) => (
                        <React.Fragment key={i}>
                            <span>{part.trim()}</span>
                            {i < arr.length - 1 && (
                                <span className={styles.folderSep}>›</span>
                            )}
                        </React.Fragment>
                    ))}
                </span>
            )}

            <span className={styles.rowDate}>{formatNoteDate(note.updatedAt)}</span>

            {isPublic && <GlobeIcon className={styles.rowGlobe} />}

            <div className={styles.noteCardActions}>
                {showBlockButton && onBlock && (
                    <button
                        className={styles.blockButton}
                        onClick={(e) => {
                            e.stopPropagation();
                            onBlock(note.id);
                        }}
                        title="Block this public note"
                    >
                        <BanIcon />
                    </button>
                )}
                {!readOnly && (
                    <NoteCardMenu
                        isPublic={isPublic}
                        onOpenChange={setMenuOpen}
                        onTogglePublic={onTogglePublic}
                        onRename={onRename}
                        onCreateSubnote={onCreateSubnote}
                        onDelete={onDelete}
                    />
                )}
            </div>
        </div>
    );
};
