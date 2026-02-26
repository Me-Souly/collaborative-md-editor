import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { SearchIcon } from '@components/common/ui/icons';
import { useSearch } from '@components/common/layout/topbar/hooks/useSearch';
import { useSearchKeyboard } from '@components/common/layout/topbar/hooks/useSearchKeyboard';
import { SearchResults } from '@components/common/layout/topbar/SearchResults';
import * as styles from '@components/common/layout/topbar/TopBar.module.css';

interface SearchModalProps {
    open: boolean;
    onClose: () => void;
}

export const SearchModal: React.FC<SearchModalProps> = ({ open, onClose }) => {
    const navigate = useNavigate();
    const [query, setQuery] = useState('');

    const { myResults, publicResults } = useSearch(query);
    const allResults = useMemo(() => [...myResults, ...publicResults], [myResults, publicResults]);

    const handleSelectNote = (noteId: string) => {
        navigate(`/note/${noteId}`);
        onClose();
    };

    const { focusedIndex, handleKeyDown, resetFocus } = useSearchKeyboard(allResults, handleSelectNote);

    useEffect(() => {
        if (!open) {
            setQuery('');
            resetFocus();
        }
    }, [open, resetFocus]);

    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        if (open) window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [open, onClose]);

    if (!open) return null;

    const showResults = query.trim().length >= 3;

    return (
        <div className={styles.modalOverlay} onClick={onClose}>
            <div className={styles.modalPanel} onClick={(e) => e.stopPropagation()}>
                <div className={styles.modalInputRow}>
                    <SearchIcon className={styles.modalSearchIcon} />
                    <input
                        autoFocus
                        type="text"
                        className={styles.modalInput}
                        placeholder="Search notes..."
                        value={query}
                        onChange={(e) => {
                            setQuery(e.target.value);
                            resetFocus();
                        }}
                        onKeyDown={(e) => {
                            handleKeyDown(e, showResults);
                        }}
                    />
                    <kbd className={styles.modalEscHint}>esc</kbd>
                </div>

                {showResults ? (
                    <SearchResults
                        myResults={myResults}
                        publicResults={publicResults}
                        query={query.trim()}
                        focusedIndex={focusedIndex}
                        onSelectNote={handleSelectNote}
                        className={styles.searchResultsModal}
                    />
                ) : (
                    <div className={styles.modalEmptyHint}>
                        <p className={styles.modalEmptyText}>
                            {query.trim().length === 0
                                ? 'Type to search notes...'
                                : 'Type at least 3 characters'}
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};
