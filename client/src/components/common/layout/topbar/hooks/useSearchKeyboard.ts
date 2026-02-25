import { useState, useCallback } from 'react';
import type { SearchResult } from '@components/common/layout/topbar/hooks/useSearch';

export const useSearchKeyboard = (
    allResults: SearchResult[],
    onSelect: (noteId: string) => void,
) => {
    const [focusedIndex, setFocusedIndex] = useState(-1);

    const handleKeyDown = useCallback(
        (e: React.KeyboardEvent<HTMLInputElement>, showDropdown: boolean) => {
            if (!showDropdown) return;

            switch (e.key) {
                case 'ArrowDown':
                    e.preventDefault();
                    setFocusedIndex((prev) => (prev < allResults.length - 1 ? prev + 1 : 0));
                    break;
                case 'ArrowUp':
                    e.preventDefault();
                    setFocusedIndex((prev) => (prev > 0 ? prev - 1 : allResults.length - 1));
                    break;
                case 'Enter':
                    e.preventDefault();
                    if (focusedIndex >= 0 && focusedIndex < allResults.length) {
                        const note = allResults[focusedIndex];
                        onSelect(note.id);
                    }
                    break;
                case 'Escape':
                    setFocusedIndex(-1);
                    break;
                default:
                    break;
            }
        },
        [allResults, focusedIndex, onSelect],
    );

    const resetFocus = useCallback(() => {
        setFocusedIndex(-1);
    }, []);

    return {
        focusedIndex,
        handleKeyDown,
        resetFocus,
    };
};
