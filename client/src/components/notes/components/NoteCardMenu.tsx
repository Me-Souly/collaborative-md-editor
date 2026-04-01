import React, { useState, useEffect, useRef } from 'react';
import { MoreVerticalIcon } from '@components/common/ui/icons';
import { TagInput } from '@components/notes/TagInput';
import { useDropdownPlacement } from '@hooks/useDropdownPlacement';
import * as styles from '@components/notes/NoteCard.module.css';

const cn = (...classes: (string | undefined | false)[]) => classes.filter(Boolean).join(' ');

interface NoteTag {
    id: string;
    name: string;
    slug: string;
}

interface NoteCardMenuProps {
    noteId: string;
    tags: NoteTag[];
    isPublic: boolean;
    onTogglePublic: (e: React.MouseEvent) => void;
    onRename: (e: React.MouseEvent) => void;
    onCreateSubnote: (e: React.MouseEvent) => void;
    onDelete: (e: React.MouseEvent) => void;
    onOpenChange?: (open: boolean) => void;
    onTagsChange?: (tags: NoteTag[]) => void;
}

export const NoteCardMenu: React.FC<NoteCardMenuProps> = ({
    noteId,
    tags,
    isPublic,
    onTogglePublic,
    onRename,
    onCreateSubnote,
    onDelete,
    onOpenChange,
    onTagsChange,
}) => {
    const [showMenu, setShowMenu] = useState(false);
    const [showTagEditor, setShowTagEditor] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    const menuPlacement = useDropdownPlacement(menuRef, showMenu, 200);
    const tagPlacement = useDropdownPlacement(menuRef, showTagEditor, 180);

    const setMenu = (open: boolean) => {
        setShowMenu(open);
        onOpenChange?.(open);
    };

    useEffect(() => {
        const handleClickOutside = (event: Event) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setMenu(false);
                if (showTagEditor) {
                    setShowTagEditor(false);
                    onOpenChange?.(false);
                }
            }
        };

        if (showMenu || showTagEditor) {
            document.addEventListener('pointerdown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('pointerdown', handleClickOutside);
        };
    }, [showMenu, showTagEditor]);

    return (
        <div ref={menuRef}>
            <button
                className={styles.menuButton}
                onClick={(e) => {
                    e.stopPropagation();
                    setMenu(!showMenu);
                }}
            >
                <MoreVerticalIcon className={styles.menuIcon} />
            </button>
            {showMenu && (
                <div className={cn(styles.dropdownMenu, menuPlacement === 'top' && styles.dropdownMenuUp)}>
                    <button
                        className={styles.dropdownItem}
                        onClick={(e) => {
                            onTogglePublic(e);
                            setMenu(false);
                        }}
                    >
                        {isPublic ? 'Make private' : 'Make public'}
                    </button>
                    <button
                        className={styles.dropdownItem}
                        onClick={(e) => {
                            onRename(e);
                            setMenu(false);
                        }}
                    >
                        Rename
                    </button>
                    <button
                        className={styles.dropdownItem}
                        onClick={(e) => {
                            onCreateSubnote(e);
                            setMenu(false);
                        }}
                    >
                        Create subnote
                    </button>
                    <button
                        className={styles.dropdownItem}
                        onClick={(e) => {
                            e.stopPropagation();
                            setMenu(false);
                            setShowTagEditor(true);
                            onOpenChange?.(true);
                        }}
                    >
                        Edit tags
                    </button>
                    <div className={styles.dropdownDivider} />
                    <button
                        className={cn(styles.dropdownItem, styles.dropdownItemDanger)}
                        onClick={(e) => {
                            onDelete(e);
                            setMenu(false);
                        }}
                    >
                        Delete
                    </button>
                </div>
            )}
            {showTagEditor && (
                <div className={cn(styles.tagEditorPopover, tagPlacement === 'top' && styles.tagEditorPopoverUp)} onClick={(e) => e.stopPropagation()}>
                    <TagInput
                        noteId={noteId}
                        initialTags={tags}
                        canEdit={true}
                        onTagsChange={(newTags) => onTagsChange?.(newTags)}
                    />
                </div>
            )}
        </div>
    );
};
