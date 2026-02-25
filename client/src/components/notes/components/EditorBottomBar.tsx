import React from 'react';
import { useNavigate } from 'react-router-dom';
import { GlobeIcon, UserIcon } from '@components/common/ui/icons';
import { ConnectionStatus } from '@hooks/useConnectionStatus';
import * as styles from '@components/notes/NoteViewer.module.css';

const STATUS_CONFIG: Record<ConnectionStatus, { label: string; dotClass: string }> = {
    connected: { label: 'Синхронизировано', dotClass: styles.dotConnected },
    connecting: { label: 'Подключение...', dotClass: styles.dotConnecting },
    offline: { label: 'Оффлайн', dotClass: styles.dotOffline },
};

interface EditorBottomBarProps {
    wordCount: number;
    isPublic?: boolean;
    ownerInfo?: { login?: string; name?: string } | null;
    ownerId?: string;
    connStatus?: ConnectionStatus;
}

export const EditorBottomBar: React.FC<EditorBottomBarProps> = ({
    wordCount,
    isPublic = false,
    ownerInfo,
    ownerId,
    connStatus,
}) => {
    const navigate = useNavigate();
    const statusCfg = connStatus ? STATUS_CONFIG[connStatus] : null;

    return (
        <div className={styles.bottomBar}>
            <div className={styles.bottomBarLeft}>
                <span>{wordCount} words</span>
                <span className={styles.bottomBarSeparator}>•</span>
                <span className={styles.bottomBarEditable}>You can edit</span>
                {isPublic && (
                    <>
                        <span className={styles.bottomBarSeparator}>•</span>
                        <span className={styles.publicBadge} title="Public note">
                            <GlobeIcon className={styles.publicIcon} />
                            <span>Public</span>
                        </span>
                    </>
                )}
                {ownerInfo && (
                    <>
                        <span className={styles.bottomBarSeparator}>•</span>
                        <button
                            className={styles.ownerButton}
                            onClick={() => {
                                const identifier = ownerInfo.login || ownerId;
                                navigate(`/user/${identifier}`);
                            }}
                            title={`View ${ownerInfo.name || ownerInfo.login}'s profile`}
                        >
                            <UserIcon className={styles.ownerIcon} />
                            <span>{ownerInfo.name || ownerInfo.login}</span>
                        </button>
                    </>
                )}
            </div>
            <div className={styles.bottomBarRight}>
                {statusCfg ? (
                    <span className={styles.autoSaved} title={statusCfg.label}>
                        <span className={`${styles.autoSavedDot} ${statusCfg.dotClass}`} />
                        {statusCfg.label}
                    </span>
                ) : (
                    <span className={styles.autoSaved}>
                        <span className={styles.autoSavedDot} />
                        Auto-saved
                    </span>
                )}
            </div>
        </div>
    );
};
