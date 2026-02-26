import React from 'react';
import { SearchIcon } from '@components/common/ui/icons';
import * as styles from '@components/common/layout/topbar/TopBar.module.css';

const cn = (...classes: (string | undefined | false)[]) => classes.filter(Boolean).join(' ');

interface TopBarSearchProps {
    className?: string;
    onOpen: () => void;
}

export const TopBarSearch: React.FC<TopBarSearchProps> = ({ className, onOpen }) => {
    return (
        <button
            type="button"
            className={cn(styles.searchTrigger, className)}
            aria-label="Search notes"
        >
            <SearchIcon className={styles.searchTriggerIcon} />
            <span className={styles.searchTriggerText}>Search notes...</span>
            <kbd className={styles.searchTriggerKbd} aria-hidden="true">
                ⌘K
            </kbd>{' '}
            <kbd className={styles.searchTriggerKbd}>⌘K</kbd>
        </button>
    );
};
