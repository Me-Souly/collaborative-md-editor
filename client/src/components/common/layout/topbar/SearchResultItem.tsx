import React from 'react';
import { FileTextIcon, GlobeIcon, StarIcon } from '@components/common/ui/icons';
import { highlightMatch } from '@components/common/layout/topbar/utils/searchUtils';
import type { SearchResult } from '@components/common/layout/topbar/hooks/useSearch';
import * as styles from '@components/common/layout/topbar/TopBar.module.css';

const cn = (...classes: (string | undefined | false)[]) => classes.filter(Boolean).join(' ');

interface SearchResultItemProps {
    note: SearchResult;
    query: string;
    isFocused: boolean;
    onSelect: (noteId: string) => void;
    variant: 'own' | 'public';
}

function formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('en', { day: 'numeric', month: 'short' });
}

export const SearchResultItem: React.FC<SearchResultItemProps> = ({
    note,
    query,
    isFocused,
    onSelect,
    variant,
}) => {
    const Icon = variant === 'public' ? GlobeIcon : FileTextIcon;

    // Right-side meta: folder path for own notes, date for public notes
    const rightMeta =
        variant === 'own'
            ? note.folderPath || null
            : note.updatedAt
              ? formatDate(note.updatedAt)
              : null;

    return (
        <button
            type="button"
            className={cn(styles.cmdkItem, isFocused && styles.cmdkItemFocused)}
            onClick={() => onSelect(note.id)}
        >
            <Icon className={styles.cmdkItemIcon} />
            <span className={styles.cmdkItemTitle}>
                {query ? highlightMatch(note.title || 'Untitled', query) : note.title || 'Untitled'}
            </span>
            {rightMeta && <span className={styles.cmdkItemMeta}>{rightMeta}</span>}
            {note.meta?.isFavorite && <StarIcon className={styles.searchResultStar} />}
        </button>
    );
};
