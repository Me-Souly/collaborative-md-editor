import React from 'react';
import * as styles from '@components/common/layout/topbar/TopBar.module.css';

const cn = (...classes: (string | undefined | false)[]) => classes.filter(Boolean).join(' ');

type SyncStatusType = 'synced' | 'saving' | 'offline';

interface SyncStatusProps {
    status: SyncStatusType;
}

export const SyncStatus: React.FC<SyncStatusProps> = ({ status }) => {
    const dotClass = {
        synced: styles.syncDotSynced,
        saving: styles.syncDotSaving,
        offline: styles.syncDotOffline,
    }[status];

    const text = {
        synced: 'Synced',
        saving: 'Saving...',
        offline: 'Offline',
    }[status];

    return (
        <div className={styles.syncStatus}>
            <span className={cn(styles.syncDot, dotClass)} />
            <span className={styles.syncText}>{text}</span>
        </div>
    );
};
