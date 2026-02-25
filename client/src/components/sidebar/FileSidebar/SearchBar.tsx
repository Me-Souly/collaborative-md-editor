import React from 'react';
import { observer } from 'mobx-react-lite';
import { useSidebarStore } from '@hooks/useStores';
import { SearchIcon } from '@components/common/ui/icons';
import * as styles from '@components/sidebar/FileSidebar.module.css';

export const SearchBar: React.FC = observer(() => {
    const sidebarStore = useSidebarStore();

    if (sidebarStore.collapsed) return null;

    return (
        <div className={styles.search}>
            <div className={styles.searchWrapper}>
                <SearchIcon className={styles.searchIcon} />
                <input
                    type="text"
                    placeholder="Search..."
                    className={styles.searchInput}
                    value={sidebarStore.searchQuery}
                    onChange={(e) => sidebarStore.setSearchQuery(e.target.value)}
                />
            </div>
        </div>
    );
});
