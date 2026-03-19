import ApiError from '../exceptions/api-error.js';

const activatedMiddleware = function (req, res, next) {
    if (process.env.AUTO_ACTIVATE === 'true') {
        return next();
    }

    const userData = req.user;
    if (!userData) {
        return next(ApiError.UnauthorizedError());
    }

    if (!userData.isActivated) {
        return next(ApiError.ForbiddenError('Аккаунт не активирован. Проверьте email.'));
    }

    next();
};

export default activatedMiddleware;
