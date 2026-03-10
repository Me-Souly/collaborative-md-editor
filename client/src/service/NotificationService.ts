import $api from '@http';

export default class NotificationService {
    static getAll() {
        return $api.get('/notifications');
    }

    static markRead(id: string) {
        return $api.patch(`/notifications/${id}/read`);
    }

    static markAllRead() {
        return $api.patch('/notifications/read-all');
    }

    static delete(id: string) {
        return $api.delete(`/notifications/${id}`);
    }
}
