import { userRepository } from '../repositories/index.js';
import ApiError from '../exceptions/api-error.js';

const checkUserActive = async function (req, res, next) {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return next(ApiError.UnauthorizedError());
        }

        const user = await userRepository.findById(userId);
        if (!user) {
            return next(ApiError.UnauthorizedError());
        }

        if (user.isDeleted) {
            return next(ApiError.ForbiddenError('Account has been deleted'));
        }

        next();
    } catch {
        throw ApiError.BadRequest();
    }
};

export default checkUserActive;
