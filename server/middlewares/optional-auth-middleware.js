import tokenService from '../services/token-service.js';

const optionalAuthMiddleware = function (req, res, next) {
    try {
        const authorizationHeader = req.headers.authorization;
        if (authorizationHeader) {
            const accessToken = authorizationHeader.split(' ')[1];
            if (accessToken) {
                const userData = tokenService.validateAccessToken(accessToken);
                if (userData) {
                    req.user = userData;
                }
            }
        }
    } catch {
        // Игнорируем ошибки — гостевой доступ продолжит работу без req.user
    }
    next();
};

export default optionalAuthMiddleware;
