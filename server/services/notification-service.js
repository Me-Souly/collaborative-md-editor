import { NotificationModel } from '../models/mongo/index.js';

// userId (string) → Set<Response>
const sseClients = new Map();

class NotificationService {
    // ── SSE клиенты ────────────────────────────────────────────────
    addSSEClient(userId, res) {
        const key = userId.toString();
        if (!sseClients.has(key)) sseClients.set(key, new Set());
        sseClients.get(key).add(res);
    }

    removeSSEClient(userId, res) {
        const key = userId.toString();
        const set = sseClients.get(key);
        if (!set) return;
        set.delete(res);
        if (set.size === 0) sseClients.delete(key);
    }

    pushToUser(userId, payload) {
        const key = userId.toString();
        const set = sseClients.get(key);
        if (!set || set.size === 0) return;
        const line = `data: ${JSON.stringify(payload)}\n\n`;
        for (const res of set) {
            try { res.write(line); } catch { /* клиент отключился */ }
        }
    }

    // ── CRUD ────────────────────────────────────────────────────────
    async create(userId, type, data) {
        const notification = await NotificationModel.create({ userId, type, data });
        this.pushToUser(userId, {
            id:        notification._id,
            type:      notification.type,
            data:      notification.data,
            isRead:    notification.isRead,
            createdAt: notification.createdAt,
        });
        return notification;
    }

    async getForUser(userId, limit = 30) {
        const docs = await NotificationModel
            .find({ userId })
            .sort({ createdAt: -1 })
            .limit(limit)
            .lean();

        return docs.map((n) => ({
            id:        n._id,
            type:      n.type,
            data:      n.data,
            isRead:    n.isRead,
            createdAt: n.createdAt,
        }));
    }

    async markRead(notificationId, userId) {
        await NotificationModel.updateOne(
            { _id: notificationId, userId },
            { $set: { isRead: true } },
        );
    }

    async markAllRead(userId) {
        await NotificationModel.updateMany(
            { userId, isRead: false },
            { $set: { isRead: true } },
        );
    }

    async deleteOne(notificationId, userId) {
        await NotificationModel.deleteOne({ _id: notificationId, userId });
    }
}

export default new NotificationService();
