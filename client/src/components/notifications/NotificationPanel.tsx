import React, { useEffect, useRef } from 'react';
import { observer } from 'mobx-react-lite';
import { useNavigate } from 'react-router-dom';
import { useNotificationStore } from '@hooks/useStores';
import NotificationService from '@service/NotificationService';
import { BellIcon } from '@components/common/ui/icons';
import * as styles from './NotificationPanel.module.css';

function formatRelativeTime(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60_000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
}

function notificationText(n: { type: string; data: { actorLogin: string; noteTitle: string; permission?: string } }) {
    if (n.type === 'note_shared') {
        const perm = n.data.permission === 'edit' ? 'edit' : 'view';
        return (
            <>
                <strong>{n.data.actorLogin || 'Someone'}</strong> shared{' '}
                <em>"{n.data.noteTitle || 'a note'}"</em> with you ({perm})
            </>
        );
    }
    if (n.type === 'access_revoked') {
        return (
            <>
                <strong>{n.data.actorLogin || 'Someone'}</strong> revoked your access to{' '}
                <em>"{n.data.noteTitle || 'a note'}"</em>
            </>
        );
    }
    if (n.type === 'note_published') {
        return (
            <>
                <strong>@{n.data.actorLogin || 'Someone'}</strong> published a new note{' '}
                <em>"{n.data.noteTitle || 'Untitled'}"</em>
            </>
        );
    }
    return 'New notification';
}

interface Props {
    onClose: () => void;
    triggerRef?: React.RefObject<HTMLElement | null>;
}

export const NotificationPanel: React.FC<Props> = observer(({ onClose, triggerRef }) => {
    const notificationStore = useNotificationStore();
    const navigate = useNavigate();
    const panelRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            const target = e.target as Node;
            if (
                panelRef.current && !panelRef.current.contains(target) &&
                !(triggerRef?.current && triggerRef.current.contains(target))
            ) {
                onClose();
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [onClose, triggerRef]);

    const handleClick = async (id: string, noteId: string, isRead: boolean) => {
        if (!isRead) {
            notificationStore.markRead(id);
            try { await NotificationService.markRead(id); } catch { /* ignore */ }
        }
        onClose();
        navigate(`/note/${noteId}`);
    };

    const handleDelete = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        notificationStore.removeNotification(id);
        try { await NotificationService.delete(id); } catch { /* ignore */ }
    };

    const handleMarkAllRead = async () => {
        notificationStore.markAllRead();
        try { await NotificationService.markAllRead(); } catch { /* ignore */ }
    };

    const { notifications } = notificationStore;

    return (
        <div className={styles.panel} ref={panelRef}>
            <div className={styles.header}>
                <span className={styles.title}>Notifications</span>
                {notifications.some(n => !n.isRead) && (
                    <button className={styles.markAllBtn} onClick={handleMarkAllRead}>
                        Mark all read
                    </button>
                )}
            </div>

            <div className={styles.list}>
                {notifications.length === 0 ? (
                    <div className={styles.empty}>
                        <BellIcon className={styles.emptyIcon} />
                        <p style={{ margin: '6px 0 2px', fontWeight: 500 }}>All quiet here</p>
                        <p style={{ margin: 0, fontSize: 12, opacity: 0.6 }}>You have no notifications</p>
                    </div>
                ) : (
                    notifications.map(n => (
                        <div
                            key={n._id}
                            className={`${styles.item} ${!n.isRead ? styles.unread : ''}`}
                            onClick={() => handleClick(n._id, n.data.noteId, n.isRead)}
                        >
                            <div className={styles.itemBody}>
                                <span className={styles.itemText}>{notificationText(n)}</span>
                                <span className={styles.itemTime}>{formatRelativeTime(n.createdAt)}</span>
                            </div>
                            <button
                                className={styles.deleteBtn}
                                onClick={(e) => handleDelete(e, n._id)}
                                title="Dismiss"
                            >
                                ×
                            </button>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
});
