import React, { useState, useEffect, useMemo } from 'react';
import { observer } from 'mobx-react-lite';
import { useNavigate } from 'react-router-dom';
import { SearchIcon } from '@components/common/ui/icons';
import { useSidebarStore } from '@hooks/useStores';
import { useSearch } from '@components/common/layout/topbar/hooks/useSearch';
import { useSearchKeyboard } from '@components/common/layout/topbar/hooks/useSearchKeyboard';
import { SearchResults } from '@components/common/layout/topbar/SearchResults';
import * as styles from '@components/common/layout/topbar/TopBar.module.css';

interface SearchModalProps {
    open: boolean;
    onClose: () => void;
}

export const SearchModal: React.FC<SearchModalProps> = observer(({ open, onClose }) => {
    const navigate = useNavigate();
    const sidebarStore = useSidebarStore();
    const [query, setQuery] = useState('');

    // Pass fileTree from observer component so MobX tracks it
    const { myResults, publicResults, isSearching } = useSearch(query, sidebarStore.fileTree);
    const allResults = useMemo(() => [...myResults, ...publicResults], [myResults, publicResults]);

    const handleSelectNote = (noteId: string) => {
        navigate(`/note/${noteId}`);
        onClose();
    };

    const { focusedIndex, handleKeyDown, resetFocus } = useSearchKeyboard(
        allResults,
        handleSelectNote,
    );

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

    return (
        <div className={styles.modalOverlay} onClick={onClose}>
            <div className={styles.modalPanel} onClick={(e) => e.stopPropagation()}>
                {/* Input row */}
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
                        onKeyDown={(e) => handleKeyDown(e, true)}
                    />
                    <kbd className={styles.modalEscHint}>esc</kbd>
                </div>

                {/* Results — always shown (own notes appear even with empty query) */}
                <SearchResults
                    myResults={myResults}
                    publicResults={publicResults}
                    query={query.trim()}
                    focusedIndex={focusedIndex}
                    onSelectNote={handleSelectNote}
                    isSearching={isSearching}
                />
            </div>
        </div>
    );
});
