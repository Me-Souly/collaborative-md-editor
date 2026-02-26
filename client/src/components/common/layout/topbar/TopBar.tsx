import React, { useState, useEffect } from 'react';
import { observer } from 'mobx-react-lite';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@hooks/useStores';
import { useServerStatus } from '@hooks/useServerStatus';
import {
    ShareIcon,
    ShieldIcon,
    GlobeIcon,
    LockIcon,
    EyeOffIcon,
    MaximizeIcon,
    EyeIcon,
} from '@components/common/ui/icons';
import { TopBarBreadcrumbs } from '@components/common/layout/topbar/TopBarBreadcrumbs';
import { TopBarSearch } from '@components/common/layout/topbar/TopBarSearch';
import { SearchModal } from '@components/common/layout/topbar/SearchModal';
import { SyncStatus } from '@components/common/layout/topbar/SyncStatus';
import { CollaboratorsList } from '@components/common/layout/topbar/CollaboratorsList';
import { UserMenu } from '@components/common/layout/topbar/UserMenu';
import * as styles from '@components/common/layout/topbar/TopBar.module.css';

const cn = (...classes: (string | undefined | false)[]) => classes.filter(Boolean).join(' ');

type PreviewMode = 'split' | 'edit' | 'preview';

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
    onTogglePublic?: () => void;
    previewMode?: PreviewMode;
    onPreviewModeChange?: (mode: PreviewMode) => void;
}

export const TopBar: React.FC<TopBarProps> = observer(
    ({
        noteTitle,
        breadcrumbs: _breadcrumbs = [],
        onShareClick,
        collaborators = [],
        noteOwnerId,
        noteOwnerLogin,
        noteOwnerName,
        isPublic = false,
        onTogglePublic,
        previewMode,
        onPreviewModeChange,
    }) => {
        const navigate = useNavigate();
        const authStore = useAuthStore();
        const isConnected = useServerStatus();
        const syncStatus = isConnected ? 'synced' : 'offline';

        const isNoteView = Boolean(noteTitle);

        const [cmdkOpen, setCmdkOpen] = useState(false);

        useEffect(() => {
            const handler = (e: KeyboardEvent) => {
                if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                    e.preventDefault();
                    setCmdkOpen((v) => !v);
                }
            };
            window.addEventListener('keydown', handler);
            return () => window.removeEventListener('keydown', handler);
        }, []);

        return (
            <>
                <header className={styles.topBar}>
                    {/* Left zone — expands on note page, shrinks on home */}
                    <div className={cn(styles.topBarLeft, isNoteView && styles.topBarLeftFull)}>
                        <TopBarBreadcrumbs
                            noteTitle={noteTitle}
                            noteOwnerId={noteOwnerId}
                            noteOwnerLogin={noteOwnerLogin}
                            noteOwnerName={noteOwnerName}
                        />
                    </div>

                    {/* Center zone — search trigger, home page only */}
                    {!isNoteView && (
                        <div className={styles.topBarCenter}>
                            <TopBarSearch onOpen={() => setCmdkOpen(true)} />
                        </div>
                    )}

                    {/* Right zone */}
                    <div className={styles.actions}>
                        {!isNoteView && <SyncStatus status={syncStatus} />}

                        {/* Public/Private toggle pill — owner only */}
                        {isNoteView && onTogglePublic && (
                            <button
                                className={cn(
                                    styles.publicPill,
                                    isPublic && styles.publicPillPublic,
                                )}
                                onClick={onTogglePublic}
                                title={isPublic ? 'Make private' : 'Make public'}
                            >
                                {isPublic ? (
                                    <GlobeIcon className={styles.publicPillIcon} />
                                ) : (
                                    <LockIcon className={styles.publicPillIcon} />
                                )}
                                <span>{isPublic ? 'Public' : 'Private'}</span>
                            </button>
                        )}

                        {/* Static public badge — non-owner view */}
                        {isNoteView && !onTogglePublic && isPublic && (
                            <span className={styles.publicBadge} title="Public note">
                                <GlobeIcon className={styles.publicIcon} />
                                <span className={styles.publicText}>Public</span>
                            </span>
                        )}

                        {/* View mode segmented control */}
                        {isNoteView && previewMode && onPreviewModeChange && (
                            <div
                                className={styles.viewModeGroup}
                                role="group"
                                aria-label="View mode"
                            >
                                <button
                                    className={cn(
                                        styles.viewModeBtn,
                                        previewMode === 'edit' && styles.viewModeBtnActive,
                                    )}
                                    onClick={() => onPreviewModeChange('edit')}
                                    title="Edit only"
                                    aria-pressed={previewMode === 'edit'}
                                >
                                    <EyeOffIcon className={styles.viewModeIcon} />
                                </button>
                                <button
                                    className={cn(
                                        styles.viewModeBtn,
                                        previewMode === 'split' && styles.viewModeBtnActive,
                                    )}
                                    onClick={() => onPreviewModeChange('split')}
                                    title="Split view"
                                    aria-pressed={previewMode === 'split'}
                                >
                                    <MaximizeIcon className={styles.viewModeIcon} />
                                </button>
                                <button
                                    className={cn(
                                        styles.viewModeBtn,
                                        previewMode === 'preview' && styles.viewModeBtnActive,
                                    )}
                                    onClick={() => onPreviewModeChange('preview')}
                                    title="Preview only"
                                    aria-pressed={previewMode === 'preview'}
                                >
                                    <EyeIcon className={styles.viewModeIcon} />
                                </button>
                            </div>
                        )}
                        {isNoteView && onShareClick && authStore.user?.isActivated && (
                            <button
                                className={cn(styles.button, styles.buttonPrimary)}
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
                <SearchModal open={cmdkOpen} onClose={() => setCmdkOpen(false)} />
            </>
        );
    },
);
