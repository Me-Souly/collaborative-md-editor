import ApiError from '../exceptions/api-error.js';

const moderatorMiddleware = async function (req, res, next) {
    if (req.method === 'OPTIONS') {
        next();
    }

    try {
        const userData = req.user;
        if (!userData || userData.role !== 'moderator') {
            return next(ApiError.ForbiddenError());
        }

        return next();
    } catch {
        return next(ApiError.ForbiddenError());
    }
};

export default moderatorMiddleware;
