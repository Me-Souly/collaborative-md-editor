import ApiError from '../exceptions/api-error.js';
import tokenService from '../services/token-service.js';
import securityLogger from '../services/security-logger.js';

const authMiddleware = function (req, _res, next) {
    try {
        const authorizationHeader = req.headers.authorization;
        if (!authorizationHeader) {
            securityLogger.unauthorized(req);
            return next(ApiError.UnauthorizedError());
        }

        const accessToken = authorizationHeader.split(' ')[1];
        if (!accessToken) {
            securityLogger.unauthorized(req);
            return next(ApiError.UnauthorizedError());
        }

        const userData = tokenService.validateAccessToken(accessToken);
        if (!userData) {
            securityLogger.tokenInvalid(req);
            return next(ApiError.UnauthorizedError());
        }

        req.user = userData;
        next();
    } catch {
        return next(ApiError.UnauthorizedError());
    }
};

export default authMiddleware;
