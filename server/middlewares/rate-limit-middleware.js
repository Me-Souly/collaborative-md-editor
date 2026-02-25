import rateLimit from 'express-rate-limit';

// Helper для безопасного получения ключа (userId или IP)
const getUserOrIpKey = (req) => {
    // Если пользователь авторизован, используем его ID
    if (req.user?.id) {
        return `user:${req.user.id}`;
    }
    // Иначе возвращаем undefined, чтобы использовался стандартный IP-ключ
    return undefined;
};

// Строгий лимит для аутентификации (защита от brute-force)
export const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 минут
    max: 5, // 5 попыток
    message: {
        error: 'Too many login attempts, please try again after 15 minutes',
        retryAfter: 15 * 60,
    },
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    skipSuccessfulRequests: false, // Считаем все запросы
});

// Лимит для регистрации (защита от спама аккаунтов)
export const registrationLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 час
    max: 5, // 5 регистраций с одного IP
    message: {
        error: 'Too many accounts created from this IP, please try again after an hour',
        retryAfter: 60 * 60,
    },
    standardHeaders: true,
    legacyHeaders: false,
});

// Лимит для сброса пароля (защита от спама email)
export const passwordResetLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 час
    max: 3, // 3 попытки
    message: {
        error: 'Too many password reset attempts, please try again after an hour',
        retryAfter: 60 * 60,
    },
    standardHeaders: true,
    legacyHeaders: false,
});

// Общий лимит для API (защита от DoS)
const isDevelopment = process.env.NODE_ENV !== 'production';

export const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 минут
    max: isDevelopment ? 500 : 100, // В dev режиме более мягкий лимит
    message: {
        error: 'Too many requests from this IP, please try again after 15 minutes',
        retryAfter: 15 * 60,
    },
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => {
        // Пропускаем WebSocket upgrade запросы, health check и CSRF token
        return (
            req.url === '/health' ||
            req.url === '/csrf-token' ||
            req.headers.upgrade === 'websocket'
        );
    },
});

// Более мягкий лимит для авторизованных пользователей
export const authenticatedLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 минут
    max: 300, // 300 запросов для авторизованных
    message: {
        error: 'Too many requests, please slow down',
        retryAfter: 15 * 60,
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req, _res) => {
        // Используем userId если есть, иначе стандартный IP
        const userKey = getUserOrIpKey(req);
        return userKey || req.ip;
    },
    validate: { keyGeneratorIpFallback: false }, // Отключаем валидацию IPv6 для кастомного keyGenerator
});

// Строгий лимит для создания контента (notes, folders, comments)
export const createContentLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 час
    max: 50, // 50 созданий в час
    message: {
        error: 'Content creation limit reached, please try again later',
        retryAfter: 60 * 60,
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req, _res) => {
        // Используем userId если есть, иначе стандартный IP
        const userKey = getUserOrIpKey(req);
        return userKey || req.ip;
    },
    validate: { keyGeneratorIpFallback: false }, // Отключаем валидацию IPv6 для кастомного keyGenerator
});

// Мягкий лимит для CSRF токена (нужен для частых обновлений в dev режиме)
export const csrfTokenLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 минут
    max: isDevelopment ? 200 : 50, // В dev режиме разрешаем больше запросов
    message: {
        error: 'Too many CSRF token requests, please try again later',
        retryAfter: 15 * 60,
    },
    standardHeaders: true,
    legacyHeaders: false,
});
