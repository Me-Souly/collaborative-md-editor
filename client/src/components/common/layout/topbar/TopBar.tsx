import React, { useState, useEffect, useRef } from 'react';
import { observer } from 'mobx-react-lite';
import { useNavigate } from 'react-router-dom';
import { useAuthStore, useNotificationStore, useSidebarStore } from '@hooks/useStores';
import { useIsMobile } from '@hooks/useMediaQuery';
import { useServerStatus } from '@hooks/useServerStatus';
import {
    ShareIcon,
    ShieldIcon,
    GlobeIcon,
    LockIcon,
    BellIcon,
    TagIcon,
} from '@components/common/ui/icons';
import { TagInput } from '@components/notes/TagInput';
import { TopBarBreadcrumbs } from '@components/common/layout/topbar/TopBarBreadcrumbs';
import { TopBarSearch } from '@components/common/layout/topbar/TopBarSearch';
import { SearchModal } from '@components/common/layout/topbar/SearchModal';
import { SyncStatus } from '@components/common/layout/topbar/SyncStatus';
import { CollaboratorsList } from '@components/common/layout/topbar/CollaboratorsList';
import { UserMenu } from '@components/common/layout/topbar/UserMenu';
import { NotificationPanel } from '@components/notifications/NotificationPanel';
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
    onTogglePublic?: () => void;
    isOwner?: boolean;
    onRename?: (newTitle: string) => Promise<void>;
    autoFocusTitle?: boolean;
    onTitleConfirmed?: () => void;
    onLeaveNote?: () => void;
    tags?: Array<{ id: string; name: string; slug: string }>;
    noteId?: string;
    canEditTags?: boolean;
    onTagsChange?: (tags: Array<{ id: string; name: string; slug: string }>) => void;
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
        isOwner = false,
        onRename,
        autoFocusTitle = false,
        onTitleConfirmed,
        onLeaveNote,
        tags,
        noteId,
        canEditTags = false,
        onTagsChange,
    }) => {
        const navigate = useNavigate();
        const authStore = useAuthStore();
        const notificationStore = useNotificationStore();
        const sidebarStore = useSidebarStore();
        const isMobile = useIsMobile();
        const isConnected = useServerStatus();
        const syncStatus = isConnected ? 'synced' : 'offline';

        const isNoteView = Boolean(noteTitle);

        const notifWrapperRef = useRef<HTMLDivElement>(null);
        const tagsWrapperRef = useRef<HTMLDivElement>(null);
        const [cmdkOpen, setCmdkOpen] = useState(false);
        const [notifOpen, setNotifOpen] = useState(false);
        const [tagsOpen, setTagsOpen] = useState(false);

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

        // Close tags popover on outside click
        useEffect(() => {
            if (!tagsOpen) return;
            const handler = (e: Event) => {
                if (tagsWrapperRef.current && !tagsWrapperRef.current.contains(e.target as Node)) {
                    setTagsOpen(false);
                }
            };
            document.addEventListener('pointerdown', handler);
            return () => document.removeEventListener('pointerdown', handler);
        }, [tagsOpen]);

        return (
            <>
                <header className={styles.topBar}>
                    {/* Hamburger — mobile only */}
                    {isMobile && authStore.isAuth && (
                        <button
                            className={styles.hamburgerBtn}
                            onClick={() => sidebarStore.toggleCollapse()}
                            aria-label="Toggle menu"
                        >
                            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                                <line x1="3" y1="5" x2="17" y2="5" />
                                <line x1="3" y1="10" x2="17" y2="10" />
                                <line x1="3" y1="15" x2="17" y2="15" />
                            </svg>
                        </button>
                    )}

                    {/* Left zone — expands on note page, shrinks on home */}
                    <div className={cn(styles.topBarLeft, isNoteView && styles.topBarLeftFull)}>
                        <TopBarBreadcrumbs
                            noteTitle={noteTitle}
                            noteOwnerId={noteOwnerId}
                            noteOwnerLogin={noteOwnerLogin}
                            noteOwnerName={noteOwnerName}
                            isOwner={isOwner}
                            onRename={onRename}
                            autoFocusTitle={autoFocusTitle}
                            onTitleConfirmed={onTitleConfirmed}
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

                        {/* Tags popover */}
                        {isNoteView && noteId && (tags || canEditTags) && (
                            <div className={styles.tagsWrapper} ref={tagsWrapperRef}>
                                <button
                                    className={cn(styles.tagsBtn, tagsOpen && styles.tagsBtnActive)}
                                    onClick={() => setTagsOpen(v => !v)}
                                    title="Tags"
                                >
                                    <TagIcon className={styles.tagsBtnIcon} />
                                    {tags && tags.length > 0 && (
                                        <span className={styles.tagsBtnCount}>{tags.length}</span>
                                    )}
                                </button>
                                {tagsOpen && (
                                    <div className={styles.tagsPopover}>
                                        <TagInput
                                            noteId={noteId}
                                            initialTags={tags ?? []}
                                            canEdit={canEditTags}
                                            onTagsChange={onTagsChange}
                                        />
                                    </div>
                                )}
                            </div>
                        )}

                        {isNoteView && isOwner && onShareClick && authStore.user?.isActivated && (
                            <button
                                className={cn(styles.button, styles.buttonPrimary)}
                                onClick={onShareClick}
                            >
                                <ShareIcon className={styles.icon} />
                                <span className={styles.buttonText}>Share</span>
                            </button>
                        )}

                        {isNoteView && !isOwner && onLeaveNote && (
                            <button
                                className={cn(styles.button, styles.buttonDanger)}
                                onClick={onLeaveNote}
                                title="Leave this note"
                            >
                                <span className={styles.buttonText}>Leave</span>
                            </button>
                        )}

                        <CollaboratorsList collaborators={collaborators} />

                        {authStore.isAuth && (
                            <div className={styles.notifWrapper} ref={notifWrapperRef}>
                                <button
                                    className={styles.notifBtn}
                                    onClick={() => setNotifOpen(v => !v)}
                                    title="Notifications"
                                >
                                    <BellIcon size={18} />
                                    {notificationStore.unreadCount > 0 && (
                                        <span className={styles.notifBadge}>
                                            {notificationStore.unreadCount > 9 ? '9+' : notificationStore.unreadCount}
                                        </span>
                                    )}
                                </button>
                                {notifOpen && (
                                    <NotificationPanel
                                        onClose={() => setNotifOpen(false)}
                                        triggerRef={notifWrapperRef}
                                    />
                                )}
                            </div>
                        )}

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
