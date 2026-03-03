import React, { useState, useEffect, useRef } from 'react';
import { MoreVerticalIcon } from '@components/common/ui/icons';
import * as styles from '@components/notes/NoteCard.module.css';

const cn = (...classes: (string | undefined | false)[]) => classes.filter(Boolean).join(' ');

interface NoteCardMenuProps {
    isPublic: boolean;
    onTogglePublic: (e: React.MouseEvent) => void;
    onRename: (e: React.MouseEvent) => void;
    onCreateSubnote: (e: React.MouseEvent) => void;
    onDelete: (e: React.MouseEvent) => void;
    onOpenChange?: (open: boolean) => void;
}

export const NoteCardMenu: React.FC<NoteCardMenuProps> = ({
    isPublic,
    onTogglePublic,
    onRename,
    onCreateSubnote,
    onDelete,
    onOpenChange,
}) => {
    const [showMenu, setShowMenu] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    const setMenu = (open: boolean) => {
        setShowMenu(open);
        onOpenChange?.(open);
    };

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setMenu(false);
            }
        };

        if (showMenu) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showMenu]);

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
                <div className={styles.dropdownMenu}>
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
        </div>
    );
};
