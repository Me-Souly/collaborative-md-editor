import { doubleCsrf } from 'csrf-csrf';

const isProduction = process.env.NODE_ENV === 'production';

// Получаем секрет для CSRF
const getSecret = () => {
    const secret = process.env.CSRF_SECRET || process.env.JWT_ACCESS_SECRET;
    if (!secret) {
        console.error('[CSRF] WARNING: No CSRF_SECRET or JWT_ACCESS_SECRET defined!');
    }
    return secret || 'fallback-csrf-secret-change-me';
};

console.log('[CSRF] Initializing with secret:', getSecret() ? 'defined' : 'MISSING');

// Configure CSRF protection using double-submit cookie pattern
const {
    generateCsrfToken,     // Generates CSRF token and sets cookie (v4.x API)
    doubleCsrfProtection,  // Validates CSRF token
} = doubleCsrf({
    getSecret,
    cookieName: '__csrf', // Отличается от header name для ясности
    cookieOptions: {
        httpOnly: true,
        // В development используем 'lax' для работы cross-port (localhost:3000 -> localhost:5000)
        // В production используем 'strict' для максимальной безопасности
        sameSite: isProduction ? 'strict' : 'lax',
        secure: isProduction,
        path: '/',
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
    },
    size: 64, // Token size in bytes
    ignoredMethods: ['GET', 'HEAD', 'OPTIONS'], // Don't check CSRF on safe methods
    getTokenFromRequest: (req) => req.headers['x-csrf-token'], // Read token from header
    // v4.x требует getSessionIdentifier для привязки токена к сессии
    getSessionIdentifier: (req) => {
        // Используем IP + User-Agent как идентификатор сессии
        // (до авторизации у нас нет userId)
        return `${req.ip || 'unknown'}-${req.headers['user-agent'] || 'unknown'}`;
    },
});

/**
 * Middleware to generate and send CSRF token to client
 * Use this on routes that need to provide a CSRF token (like GET /api/csrf-token)
 */
export const csrfTokenGenerator = (req, res, next) => {
    try {
        console.log('[CSRF] Generating token...');
        const token = generateCsrfToken(req, res);
        req.csrfToken = token;
        console.log('[CSRF] Token generated successfully:', token ? token.substring(0, 20) + '...' : 'null');
        next();
    } catch (error) {
        console.error('[CSRF] Error generating token:', error.message);
        console.error('[CSRF] Full error:', error);
        next(error);
    }
};

/**
 * Middleware to validate CSRF token on state-changing requests
 * Use this on routes that modify server state (POST, PUT, DELETE, PATCH)
 *
 * Note: This automatically skips validation for GET, HEAD, OPTIONS requests
 */
export const csrfProtection = (req, res, next) => {
    // Логируем для отладки
    if (!isProduction) {
        console.log('[CSRF] Validating request:', req.method, req.url);
        console.log('[CSRF] Header token present:', !!req.headers['x-csrf-token']);
        console.log('[CSRF] Cookie __csrf present:', !!req.cookies?.['__csrf']);
    }

    doubleCsrfProtection(req, res, (err) => {
        if (err) {
            console.error('[CSRF] Validation failed:', err.message);
            console.error('[CSRF] Header:', req.headers['x-csrf-token']?.substring(0, 20) + '...');
            console.error('[CSRF] Cookie:', req.cookies?.['__csrf']?.substring(0, 20) + '...');
        }
        next(err);
    });
};

export default {
    csrfTokenGenerator,
    csrfProtection,
    generateCsrfToken,
};
