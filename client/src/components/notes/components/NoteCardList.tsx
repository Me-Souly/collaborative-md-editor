import React from 'react';
import { GlobeIcon, StarIcon, BanIcon } from '@components/common/ui/icons';
import { NoteCardMenu } from '@components/notes/components/NoteCardMenu';
import { getNotePreview, formatNoteDate } from '@components/notes/utils';
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
    onCardClick,
    onBlock,
    onTogglePublic,
    onRename,
    onCreateSubnote,
    onDelete,
}) => {
    const displayPreview = getNotePreview(note);
    const cleanPreview = displayPreview;

    return (
        <div className={cn(styles.noteCard, styles.noteCardList)} onClick={onCardClick}>
            <div className={styles.noteCardContent}>
                <div className={styles.noteCardHeader}>
                    <h3 className={styles.noteTitle}>{note.title || 'Untitled'}</h3>
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
                                onTogglePublic={onTogglePublic}
                                onRename={onRename}
                                onCreateSubnote={onCreateSubnote}
                                onDelete={onDelete}
                            />
                        )}
                    </div>
                </div>

                {displayPreview ? (
                    <p className={styles.notePreview}>
                        {displayPreview}
                        {cleanPreview.length >= 150 ? '…' : ''}
                    </p>
                ) : (
                    <p className={styles.notePreviewEmpty}>No preview available</p>
                )}

                <div className={styles.noteCardFooter}>
                    <p className={styles.noteMeta}>Обновлено {formatNoteDate(note.updatedAt)}</p>
                    {(note.isFavorite || isPublic) && (
                        <div className={styles.noteBadges}>
                            {note.isFavorite && (
                                <span className={styles.badge}>
                                    <StarIcon />
                                </span>
                            )}
                            {isPublic && (
                                <span className={styles.badge} title="Public">
                                    <GlobeIcon className={styles.sharedIcon} />
                                </span>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
