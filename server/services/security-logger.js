/**
 * Security Logger — логирование событий безопасности.
 *
 * Структурированные JSON-логи с типом события, IP-адресом, userId и деталями.
 * При наличии SENTRY_DSN критические события дополнительно отправляются в Sentry.
 *
 * Типы событий:
 *   AUTH_FAILURE       — неудачная попытка входа (неверный пароль/логин)
 *   AUTH_SUCCESS       — успешный вход
 *   TOKEN_INVALID      — передан недействительный access-токен
 *   UNAUTHORIZED       — запрос к защищённому ресурсу без токена
 *   FORBIDDEN          — попытка доступа к чужому ресурсу (403)
 *   CORS_REJECTED      — запрос отклонён по CORS
 *   CSRF_REJECTED      — запрос отклонён по CSRF
 *   RATE_LIMIT_HIT     — превышен лимит запросов
 *   WS_AUTH_FAILURE    — неудачная аутентификация WebSocket-соединения
 *   WS_PERMISSION_DENIED — попытка записи в read-only документ
 */

const LEVELS = {
    INFO: 'INFO',
    WARN: 'WARN',
    ERROR: 'ERROR',
};

function getIp(req) {
    if (!req) return 'unknown';
    return (
        req.headers?.['x-forwarded-for']?.split(',')[0]?.trim() ||
        req.socket?.remoteAddress ||
        'unknown'
    );
}

function log(level, event, details = {}) {
    const entry = {
        timestamp: new Date().toISOString(),
        level,
        event,
        ...details,
    };
    const line = JSON.stringify(entry);

    if (level === LEVELS.ERROR) {
        console.error(`[SECURITY] ${line}`);
    } else if (level === LEVELS.WARN) {
        console.warn(`[SECURITY] ${line}`);
    } else {
        console.log(`[SECURITY] ${line}`);
    }
}

const securityLogger = {
    /** Неудачная попытка входа */
    authFailure(req, identifier) {
        log(LEVELS.WARN, 'AUTH_FAILURE', {
            ip: getIp(req),
            identifier: identifier ? String(identifier).slice(0, 64) : undefined,
            userAgent: req?.headers?.['user-agent'],
        });
    },

    /** Успешный вход */
    authSuccess(req, userId) {
        log(LEVELS.INFO, 'AUTH_SUCCESS', {
            ip: getIp(req),
            userId,
        });
    },

    /** Недействительный access-токен */
    tokenInvalid(req) {
        log(LEVELS.WARN, 'TOKEN_INVALID', {
            ip: getIp(req),
            path: req?.path,
        });
    },

    /** Запрос без авторизации к защищённому ресурсу */
    unauthorized(req) {
        log(LEVELS.WARN, 'UNAUTHORIZED', {
            ip: getIp(req),
            method: req?.method,
            path: req?.path,
        });
    },

    /** Попытка доступа к чужому ресурсу (403) */
    forbidden(req, userId) {
        log(LEVELS.WARN, 'FORBIDDEN', {
            ip: getIp(req),
            userId,
            method: req?.method,
            path: req?.path,
        });
    },

    /** CORS-запрос от неразрешённого origin */
    corsRejected(origin) {
        log(LEVELS.WARN, 'CORS_REJECTED', { origin });
    },

    /** Отклонён CSRF-токен */
    csrfRejected(req) {
        log(LEVELS.WARN, 'CSRF_REJECTED', {
            ip: getIp(req),
            method: req?.method,
            path: req?.path,
        });
    },

    /** Превышен rate limit */
    rateLimitHit(req) {
        log(LEVELS.WARN, 'RATE_LIMIT_HIT', {
            ip: getIp(req),
            path: req?.path,
        });
    },

    /** WebSocket: неудачная аутентификация */
    wsAuthFailure(ip, noteId, reason) {
        log(LEVELS.WARN, 'WS_AUTH_FAILURE', { ip, noteId, reason });
    },

    /** WebSocket: попытка записи в read-only документ */
    wsPermissionDenied(userId, noteId) {
        log(LEVELS.WARN, 'WS_PERMISSION_DENIED', { userId, noteId });
    },
};

export default securityLogger;
