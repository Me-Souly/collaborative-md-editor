import React from 'react';
import { SearchResultItem } from '@components/common/layout/topbar/SearchResultItem';
import type { SearchResult } from '@components/common/layout/topbar/hooks/useSearch';
import * as styles from '@components/common/layout/topbar/TopBar.module.css';

interface SearchResultsProps {
    myResults: SearchResult[];
    publicResults: SearchResult[];
    query: string;
    focusedIndex: number;
    onSelectNote: (noteId: string) => void;
    isSearching?: boolean;
}

export const SearchResults: React.FC<SearchResultsProps> = ({
    myResults,
    publicResults,
    query,
    focusedIndex,
    onSelectNote,
    isSearching,
}) => {
    const hasResults = myResults.length > 0 || publicResults.length > 0;

    return (
        <div className={styles.cmdkResults}>
            {/* My Notes section */}
            {myResults.length > 0 && (
                <div className={styles.cmdkSection}>
                    <div className={styles.cmdkSectionLabel}>
                        {query ? 'My notes' : 'All notes'}
                    </div>
                    {myResults.map((note, index) => (
                        <SearchResultItem
                            key={note.id}
                            note={note}
                            query={query}
                            isFocused={focusedIndex === index}
                            onSelect={onSelectNote}
                            variant="own"
                        />
                    ))}
                </div>
            )}

            {myResults.length > 0 && publicResults.length > 0 && (
                <div className={styles.cmdkDivider} />
            )}

            {/* Public Notes section */}
            {publicResults.length > 0 && (
                <div className={styles.cmdkSection}>
                    <div className={styles.cmdkSectionLabel}>Public notes</div>
                    {publicResults.map((note, index) => {
                        const globalIndex = myResults.length + index;
                        return (
                            <SearchResultItem
                                key={note.id}
                                note={note}
                                query={query}
                                isFocused={focusedIndex === globalIndex}
                                onSelect={onSelectNote}
                                variant="public"
                            />
                        );
                    })}
                </div>
            )}

            {/* Empty states */}
            {!hasResults && !isSearching && query && (
                <div className={styles.cmdkEmpty}>No results for "{query}"</div>
            )}
            {!hasResults && !isSearching && !query && (
                <div className={styles.cmdkEmpty}>No notes yet</div>
            )}

            {/* Keyboard hints */}
            {hasResults && (
                <div className={styles.cmdkFooter}>
                    <span className={styles.kbd}>↑↓</span> navigate{' '}
                    <span className={styles.kbd}>↵</span> open{' '}
                    <span className={styles.kbd}>esc</span> close
                </div>
            )}
        </div>
    );
};
