import React from 'react';
import { observer } from 'mobx-react-lite';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@hooks/useStores';
import { useOnlineStatus } from '@hooks/useOnlineStatus';
import { ShareIcon, ShieldIcon } from '@components/common/ui/icons';
import { TopBarBreadcrumbs } from '@components/common/layout/topbar/TopBarBreadcrumbs';
import { TopBarSearch } from '@components/common/layout/topbar/TopBarSearch';
import { SyncStatus } from '@components/common/layout/topbar/SyncStatus';
import { CollaboratorsList } from '@components/common/layout/topbar/CollaboratorsList';
import { UserMenu } from '@components/common/layout/topbar/UserMenu';
import * as styles from '@components/common/layout/topbar/TopBar.module.css';

const cn = (...classes: (string | undefined | false)[]) => classes.filter(Boolean).join(' ');

export interface TopBarProps {
    noteTitle?: string;
    breadcrumbs?: string[];
    onShareClick?: () => void;
    collaborators?: Array<{
        id: string;
        name: string;
        avatar?: string;
        initials?: string;
        login?: string;
        username?: string;
        email?: string;
        isOnline?: boolean;
    }>;
    noteOwnerId?: string;
    noteOwnerLogin?: string;
    noteOwnerName?: string;
    isPublic?: boolean;
}

export const TopBar: React.FC<TopBarProps> = observer(
    ({
        noteTitle = 'Untitled Note',
        breadcrumbs: _breadcrumbs = [],
        onShareClick,
        collaborators = [],
        noteOwnerId,
        noteOwnerLogin,
        noteOwnerName,
        isPublic = false,
    }) => {
        const navigate = useNavigate();
        const authStore = useAuthStore();
        const isOnline = useOnlineStatus();
        const syncStatus = isOnline ? 'synced' : 'offline';

        return (
            <header className={styles.topBar}>
                <TopBarBreadcrumbs
                    noteTitle={noteTitle}
                    isPublic={isPublic}
                    noteOwnerId={noteOwnerId}
                    noteOwnerLogin={noteOwnerLogin}
                    noteOwnerName={noteOwnerName}
                />

                <TopBarSearch />

                <div className={styles.actions}>
                    <SyncStatus status={syncStatus} />

                    {onShareClick && authStore.user?.isActivated && (
                        <button
                            className={cn(styles.button, styles.buttonOutline)}
                            onClick={onShareClick}
                        >
                            <ShareIcon className={styles.icon} />
                            <span className={styles.buttonText}>Share</span>
                        </button>
                    )}

                    <CollaboratorsList collaborators={collaborators} />

                    {authStore.user?.role === 'moderator' && (
                        <button
                            className={cn(styles.button, styles.buttonOutline)}
                            onClick={() => navigate('/moderator')}
                            title="Moderator Dashboard"
                        >
                            <ShieldIcon className={styles.icon} />
                            <span className={styles.buttonText}>Moderator</span>
                        </button>
                    )}

                    <UserMenu />
                </div>
            </header>
        );
    },
);
