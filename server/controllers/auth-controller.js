import { authService } from '../services/index.js';
import securityLogger from '../services/security-logger.js';

class AuthController {
    // POST /api/login
    async login(req, res, next) {
        console.log('[AuthController] Login request received');
        console.log('[AuthController] Body:', {
            identifier: req.body?.identifier,
            password: req.body?.password ? '***' : 'missing',
        });
        console.log('[AuthController] Method:', req.method);
        console.log('[AuthController] URL:', req.url);
        console.log('[AuthController] Headers:', req.headers);
        try {
            const { identifier, password } = req.body;
            if (!identifier || !password) {
                console.log('[AuthController] Missing identifier or password');
                return res.status(400).json({ message: 'Identifier and password are required' });
            }
            console.log('[AuthController] Calling authService.login...');
            const userData = await authService.login(identifier, password);
            console.log(
                '[AuthController] Login successful, user:',
                userData.user?.email || userData.user?.login,
            );
            securityLogger.authSuccess(req, userData.user?.id);
            res.cookie('refreshToken', userData.refreshToken, {
                maxAge: parseInt(process.env.JWT_REFRESH_EXPIRES_DAYS) * 24 * 60 * 60 * 1000,
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict',
            });
            return res.json(userData);
        } catch (e) {
            console.log('[AuthController] Login error:', e.message);
            securityLogger.authFailure(req, req.body?.identifier);
            next(e);
        }
    }

    // POST /api/logout
    async logout(req, res, next) {
        try {
            const { refreshToken } = req.cookies;
            const token = await authService.logout(refreshToken);
            res.clearCookie('refreshToken');
            return res.json(token);
        } catch (e) {
            next(e);
        }
    }

    // Post /api/refresh
    async refresh(req, res, next) {
        try {
            const { refreshToken } = req.cookies;
            const userData = await authService.refresh(refreshToken);
            res.cookie('refreshToken', userData.refreshToken, {
                maxAge: parseInt(process.env.JWT_REFRESH_EXPIRES_DAYS) * 24 * 60 * 60 * 1000,
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict',
            });
            return res.json(userData);
        } catch (e) {
            next(e);
        }
    }
}

export default new AuthController();
