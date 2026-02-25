import React from 'react';
import * as styles from '@components/common/layout/topbar/TopBar.module.css';

/**
 * Утилиты для поиска
 */

export const highlightMatch = (text: string, query: string): React.ReactNode => {
    if (query.length < 3) return text;

    const parts = text.split(new RegExp(`(${query})`, 'gi'));
    return parts.map((part, index) =>
        part.toLowerCase() === query.toLowerCase() ? (
            <mark key={index} className={styles.searchHighlight}>
                {part}
            </mark>
        ) : (
            part
        ),
    );
};
