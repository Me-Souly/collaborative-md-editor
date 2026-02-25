import React from 'react';
import { observer } from 'mobx-react-lite';
import { FileTextIcon, UsersIcon } from '@components/common/ui/icons';
import { useSidebarStore } from '@hooks/useStores';
import * as styles from '@components/sidebar/FileSidebar.module.css';

const cn = (...classes: (string | undefined | false)[]) => classes.filter(Boolean).join(' ');

interface FileSidebarHeaderProps {
    collapsed: boolean;
}

export const FileSidebarHeader: React.FC<FileSidebarHeaderProps> = observer(({ collapsed }) => {
    const sidebarStore = useSidebarStore();

    return (
        <div className={styles.header}>
            {!collapsed ? (
                <>
                    <div className={styles.headerContent}>
                        <FileTextIcon className={cn(styles.icon, styles.iconPrimary)} />
                        <span className={styles.headerTitle}>NoteMark</span>
                    </div>
                    <div className={styles.headerTabs}>
                        <button
                            className={cn(
                                styles.tabButton,
                                !sidebarStore.showSharedNotes && styles.tabButtonActive,
                            )}
                            onClick={() => {
                                if (sidebarStore.showSharedNotes) {
                                    sidebarStore.showSharedNotes = false;
                                }
                            }}
                        >
                            My Notes
                        </button>
                        <button
                            className={cn(
                                styles.tabButton,
                                sidebarStore.showSharedNotes && styles.tabButtonActive,
                            )}
                            onClick={() => {
                                if (!sidebarStore.showSharedNotes) {
                                    sidebarStore.showSharedNotes = true;
                                }
                            }}
                        >
                            <UsersIcon className={styles.tabIcon} />
                            Shared
                        </button>
                    </div>
                </>
            ) : (
                <div className={styles.headerContentCentered}>
                    <FileTextIcon className={cn(styles.icon, styles.iconPrimary)} />
                </div>
            )}
        </div>
    );
});
