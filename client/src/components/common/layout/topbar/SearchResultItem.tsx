import React from 'react';
import { StarIcon } from '@components/common/ui/icons';
import { highlightMatch } from '@components/common/layout/topbar/utils/searchUtils';
import type { SearchResult } from '@components/common/layout/topbar/hooks/useSearch';
import * as styles from '@components/common/layout/topbar/TopBar.module.css';

const cn = (...classes: (string | undefined | false)[]) => classes.filter(Boolean).join(' ');

interface SearchResultItemProps {
    note: SearchResult;
    query: string;
    isFocused: boolean;
    onSelect: (noteId: string) => void;
}

export const SearchResultItem: React.FC<SearchResultItemProps> = ({
    note,
    query,
    isFocused,
    onSelect,
}) => {
    return (
        <button
            type="button"
            className={cn(styles.searchResultItem, isFocused && styles.searchResultItemFocused)}
            onClick={() => onSelect(note.id)}
        >
            <div className={styles.searchResultMeta}>
                <span className={styles.searchResultTitle}>
                    {highlightMatch(note.title || 'Untitled', query)}
                </span>
                {note.meta?.excerpt && (
                    <span className={styles.searchResultExcerpt}>
                        {highlightMatch(note.meta.excerpt, query)}
                    </span>
                )}
            </div>
            {note.meta?.isFavorite && <StarIcon className={styles.searchResultStar} />}
        </button>
    );
};
