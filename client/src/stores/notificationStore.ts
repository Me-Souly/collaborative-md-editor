import { makeAutoObservable, runInAction } from 'mobx';

export interface INotification {
    _id: string;
    type: 'note_shared' | 'access_revoked' | 'note_published';
    data: {
        noteId: string;
        noteTitle: string;
        actorId?: string;
        actorLogin: string;
        permission?: string;
    };
    isRead: boolean;
    createdAt: string;
}

class notificationStore {
    notifications: INotification[] = [];
    isSSEConnected = false;

    constructor() {
        makeAutoObservable(this);
    }

    get unreadCount() {
        return this.notifications.filter(n => !n.isRead).length;
    }

    setNotifications(list: INotification[]) {
        this.notifications = list;
    }

    addNotification(n: INotification) {
        // deduplicate by _id
        if (this.notifications.some(x => x._id === n._id)) return;
        this.notifications.unshift(n);
    }

    markRead(id: string) {
        const n = this.notifications.find(x => x._id === id);
        if (n) n.isRead = true;
    }

    markAllRead() {
        this.notifications.forEach(n => { n.isRead = true; });
    }

    removeNotification(id: string) {
        this.notifications = this.notifications.filter(n => n._id !== id);
    }

    setSSEConnected(val: boolean) {
        runInAction(() => { this.isSSEConnected = val; });
    }
}

export default notificationStore;
