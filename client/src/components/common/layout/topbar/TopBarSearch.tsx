import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { SearchIcon, XIcon } from '@components/common/ui/icons';
import { useSearch } from '@components/common/layout/topbar/hooks/useSearch';
import { useSearchKeyboard } from '@components/common/layout/topbar/hooks/useSearchKeyboard';
import { SearchResults } from '@components/common/layout/topbar/SearchResults';
import * as styles from '@components/common/layout/topbar/TopBar.module.css';

const cn = (...classes: (string | undefined | false)[]) => classes.filter(Boolean).join(' ');

interface TopBarSearchProps {
    className?: string;
}

export const TopBarSearch: React.FC<TopBarSearchProps> = ({ className }) => {
    const navigate = useNavigate();
    const searchWrapperRef = useRef<HTMLDivElement>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [isOpen, setIsOpen] = useState(false);

    const { myResults, publicResults } = useSearch(searchQuery);

    const allResults = useMemo(() => [...myResults, ...publicResults], [myResults, publicResults]);

    const showDropdown = isOpen && searchQuery.trim().length >= 3;

    const handleSelectNote = (noteId: string) => {
        navigate(`/note/${noteId}`);
        setIsOpen(false);
        setSearchQuery('');
    };

    const { focusedIndex, handleKeyDown, resetFocus } = useSearchKeyboard(
        allResults,
        handleSelectNote,
    );

    // Закрытие результатов поиска при клике вне поля
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                searchWrapperRef.current &&
                !searchWrapperRef.current.contains(event.target as Node)
            ) {
                setIsOpen(false);
                resetFocus();
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen, resetFocus]);

    const clearSearch = () => {
        setSearchQuery('');
        setIsOpen(false);
        resetFocus();
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchQuery(e.target.value);
        setIsOpen(true);
        resetFocus();
    };

    const handleInputFocus = () => {
        if (searchQuery.trim().length >= 3) {
            setIsOpen(true);
        }
    };

    return (
        <div className={cn(styles.searchContainer, className)}>
            <div className={styles.searchWrapper} ref={searchWrapperRef}>
                <SearchIcon className={styles.searchIconInput} />
                <input
                    type="text"
                    placeholder="Search notes..."
                    className={styles.searchInputTop}
                    value={searchQuery}
                    onChange={handleInputChange}
                    onFocus={handleInputFocus}
                    onKeyDown={(e) => {
                        handleKeyDown(e, showDropdown);
                        if (e.key === 'Escape') {
                            setIsOpen(false);
                        }
                    }}
                />
                {searchQuery && (
                    <button
                        type="button"
                        className={styles.searchClearButton}
                        onClick={clearSearch}
                        aria-label="Clear search"
                    >
                        <XIcon className={styles.searchClearIcon} />
                    </button>
                )}
                {showDropdown && (
                    <SearchResults
                        myResults={myResults}
                        publicResults={publicResults}
                        query={searchQuery.trim()}
                        focusedIndex={focusedIndex}
                        onSelectNote={handleSelectNote}
                    />
                )}
            </div>
        </div>
    );
};
