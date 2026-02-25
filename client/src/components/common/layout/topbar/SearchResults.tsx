import React, { useMemo } from 'react';
import { SearchResultItem } from '@components/common/layout/topbar/SearchResultItem';
import type { SearchResult } from '@components/common/layout/topbar/hooks/useSearch';
import * as styles from '@components/common/layout/topbar/TopBar.module.css';

interface SearchResultsProps {
    myResults: SearchResult[];
    publicResults: SearchResult[];
    query: string;
    focusedIndex: number;
    onSelectNote: (noteId: string) => void;
}

export const SearchResults: React.FC<SearchResultsProps> = ({
    myResults,
    publicResults,
    query,
    focusedIndex,
    onSelectNote,
}) => {
    const allResults = useMemo(() => [...myResults, ...publicResults], [myResults, publicResults]);

    const hasResults = allResults.length > 0;

    if (!hasResults) {
        return (
            <div className={styles.searchResults}>
                <div className={styles.searchEmpty}>
                    <p className={styles.searchEmptyText}>No results found</p>
                    <p className={styles.searchEmptySubtext}>Try a different search term</p>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.searchResults}>
            {myResults.length > 0 && (
                <div>
                    <div className={styles.searchSectionHeader}>
                        <span className={styles.searchSectionTitle}>My notes</span>
                        <span className={styles.searchSectionCount}>{myResults.length}</span>
                    </div>
                    <div className={styles.searchSectionBody}>
                        {myResults.map((note, index) => (
                            <SearchResultItem
                                key={note.id}
                                note={note}
                                query={query}
                                isFocused={focusedIndex === index}
                                onSelect={onSelectNote}
                            />
                        ))}
                    </div>
                </div>
            )}

            {myResults.length > 0 && publicResults.length > 0 && (
                <div className={styles.searchSectionDivider} />
            )}

            {publicResults.length > 0 && (
                <div>
                    <div className={styles.searchSectionHeader}>
                        <span className={styles.searchSectionTitle}>Public notes</span>
                        <span className={styles.searchSectionCount}>{publicResults.length}</span>
                    </div>
                    <div className={styles.searchSectionBody}>
                        {publicResults.map((note, index) => {
                            const globalIndex = myResults.length + index;
                            return (
                                <SearchResultItem
                                    key={note.id}
                                    note={note}
                                    query={query}
                                    isFocused={focusedIndex === globalIndex}
                                    onSelect={onSelectNote}
                                />
                            );
                        })}
                    </div>
                </div>
            )}

            <div className={styles.searchFooter}>
                <p className={styles.searchFooterText}>
                    <span className={styles.kbd}>↑↓</span> to navigate{' '}
                    <span className={styles.kbd}>↵</span> to select{' '}
                    <span className={styles.kbd}>esc</span> to close
                </p>
            </div>
        </div>
    );
};
