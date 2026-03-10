import { notificationService, tokenService } from '../services/index.js';

class NotificationController {
    // GET /notifications/stream
    // Token передаётся в query param т.к. EventSource не поддерживает заголовки
    async stream(req, res) {
        const token = req.query.token;
        if (!token) { res.status(401).end(); return; }

        const userData = tokenService.validateAccessToken(token);
        if (!userData) { res.status(401).end(); return; }

        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.flushHeaders();

        notificationService.addSSEClient(userData.id, res);

        // Отправляем начальный список уведомлений
        try {
            const notifications = await notificationService.getForUser(userData.id, 30);
            res.write(`data: ${JSON.stringify({ type: 'init', notifications })}\n\n`);
        } catch (e) {
            console.error('[SSE] Failed to send initial notifications:', e);
        }

        // Heartbeat каждые 25 сек
        const heartbeat = setInterval(() => {
            try { res.write(`data: ${JSON.stringify({ type: 'ping' })}\n\n`); } catch { /* ignore */ }
        }, 25_000);

        req.on('close', () => {
            clearInterval(heartbeat);
            notificationService.removeSSEClient(userData.id, res);
        });
    }

    // GET /notifications
    async getAll(req, res, next) {
        try {
            const userId = req.user.id;
            const notifications = await notificationService.getForUser(userId, 30);
            return res.json(notifications);
        } catch (e) { next(e); }
    }

    // PATCH /notifications/:id/read
    async readOne(req, res, next) {
        try {
            await notificationService.markRead(req.params.id, req.user.id);
            return res.json({ success: true });
        } catch (e) { next(e); }
    }

    // PATCH /notifications/read-all
    async readAll(req, res, next) {
        try {
            await notificationService.markAllRead(req.user.id);
            return res.json({ success: true });
        } catch (e) { next(e); }
    }

    // DELETE /notifications/:id
    async deleteOne(req, res, next) {
        try {
            await notificationService.deleteOne(req.params.id, req.user.id);
            return res.json({ success: true });
        } catch (e) { next(e); }
    }
}

export default new NotificationController();
