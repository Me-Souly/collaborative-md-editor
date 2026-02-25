import React from 'react';
import { CloudIcon, CloudOffIcon } from '@components/common/ui/icons';
import * as styles from '@components/common/layout/topbar/TopBar.module.css';

const cn = (...classes: (string | undefined | false)[]) => classes.filter(Boolean).join(' ');

type SyncStatusType = 'synced' | 'saving' | 'offline';

interface SyncStatusProps {
    status: SyncStatusType;
}

export const SyncStatus: React.FC<SyncStatusProps> = ({ status }) => {
    const syncIcons = {
        synced: <CloudIcon className={styles.syncIcon} />,
        saving: <CloudIcon className={cn(styles.syncIcon, styles.syncIconPulse)} />,
        offline: <CloudOffIcon className={cn(styles.syncIcon, styles.syncIconError)} />,
    };

    const syncTexts = {
        synced: 'Synced',
        saving: 'Saving...',
        offline: 'Offline',
    };

    return (
        <div className={styles.syncStatus}>
            {syncIcons[status]}
            <span className={styles.syncText}>{syncTexts[status]}</span>
        </div>
    );
};
