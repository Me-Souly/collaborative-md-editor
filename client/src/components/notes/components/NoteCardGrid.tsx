import React, { useState } from 'react';
import { GlobeIcon, BanIcon } from '@components/common/ui/icons';
import { NoteCardMenu } from '@components/notes/components/NoteCardMenu';
import { getNotePreview, formatNoteDate } from '@components/notes/utils';
import * as styles from '@components/notes/NoteCard.module.css';

const cn = (...classes: (string | undefined | false)[]) => classes.filter(Boolean).join(' ');

interface NoteCardGridProps {
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
    onCardClick: () => void;
    onBlock?: (noteId: string) => void;
    onTogglePublic: (e: React.MouseEvent) => void;
    onRename: (e: React.MouseEvent) => void;
    onCreateSubnote: (e: React.MouseEvent) => void;
    onDelete: (e: React.MouseEvent) => void;
}

export const NoteCardGrid: React.FC<NoteCardGridProps> = ({
    note,
    isPublic,
    readOnly,
    showBlockButton,
    staggerIndex = 0,
    onCardClick,
    onBlock,
    onTogglePublic,
    onRename,
    onCreateSubnote,
    onDelete,
}) => {
    const [menuOpen, setMenuOpen] = useState(false);
    const displayPreview = getNotePreview(note);

    return (
        <div
            className={cn(styles.noteCard, styles.noteCardGrid, styles.cardAnimate, menuOpen && styles.noteCardMenuOpen)}
            style={{ animationDelay: `${staggerIndex * 55}ms` }}
            onClick={onCardClick}
        >
            {/* Header: public pill (left) + menu (right) */}
            <div className={styles.noteCardHeader}>
                {isPublic ? (
                    <span className={styles.publicPill}>
                        <GlobeIcon className={styles.publicPillIcon} />
                        Public
                    </span>
                ) : (
                    <span />
                )}
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

            <h3 className={styles.noteTitle}>{note.title || 'Untitled'}</h3>

            {displayPreview ? (
                <p className={styles.notePreview}>{displayPreview}</p>
            ) : (
                <p className={styles.notePreviewEmpty}>No content yet</p>
            )}

            <div className={styles.noteCardFooter}>
                <p className={styles.noteMeta}>{formatNoteDate(note.updatedAt, true)}</p>
            </div>
        </div>
    );
};
