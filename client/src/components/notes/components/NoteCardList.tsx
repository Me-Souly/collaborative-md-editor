import React, { useState } from 'react';
import { FileTextIcon, GlobeIcon, BanIcon, FolderIcon } from '@components/common/ui/icons';
import { NoteCardMenu } from '@components/notes/components/NoteCardMenu';
import { formatNoteDate } from '@components/notes/utils';
import * as styles from '@components/notes/NoteCard.module.css';

const cn = (...classes: (string | undefined | false)[]) => classes.filter(Boolean).join(' ');

interface NoteTag {
    id: string;
    name: string;
    slug: string;
}

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
        tags?: NoteTag[];
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
    onTagClick?: (tagName: string) => void;
    onTagsChange?: (tags: NoteTag[]) => void;
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
    onTagClick,
    onTagsChange,
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

            {note.tags && note.tags.length > 0 && (
                <div className={styles.rowTags}>
                    {note.tags.slice(0, 2).map((tag) => (
                        <button
                            key={tag.name}
                            className={styles.cardTag}
                            onClick={(e) => {
                                e.stopPropagation();
                                onTagClick?.(tag.name);
                            }}
                        >
                            #{tag.name}
                        </button>
                    ))}
                    {note.tags.length > 2 && (
                        <span className={styles.cardTagMore}>+{note.tags.length - 2}</span>
                    )}
                </div>
            )}

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
                        noteId={note.id}
                        tags={note.tags ?? []}
                        isPublic={isPublic}
                        onOpenChange={setMenuOpen}
                        onTogglePublic={onTogglePublic}
                        onRename={onRename}
                        onCreateSubnote={onCreateSubnote}
                        onDelete={onDelete}
                        onTagsChange={onTagsChange}
                    />
                )}
            </div>
        </div>
    );
};
