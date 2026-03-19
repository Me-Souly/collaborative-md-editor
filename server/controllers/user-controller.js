import { userService, activationService } from '../services/index.js';
import { validationResult } from 'express-validator';
import ApiError from '../exceptions/api-error.js';

class UserController {
    async registration(req, res, next) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return next(ApiError.BadRequest('Error while validation', errors.array()));
            }
            const { email, username, password } = req.body;
            const userData = await userService.registration(email, username, password);
            if (process.env.AUTO_ACTIVATE !== 'true') {
                await activationService.createActivation(userData.user);
            }
            res.cookie('refreshToken', userData.refreshToken, {
                maxAge: parseInt(process.env.JWT_REFRESH_EXPIRES_DAYS) * 24 * 60 * 60 * 1000,
                httpOnly: true,
            });

            return res.json(userData);
        } catch (e) {
            next(e);
        }
    }

    async getUsers(req, res, next) {
        try {
            const users = await userService.getAllUsers();
            return res.json(users);
        } catch (e) {
            next(e);
        }
    }

    async updateUser(req, res, next) {
        try {
            const updateData = req.body;
            const userId = req.user.id;
            const userData = await userService.updateUser(userId, updateData);
            return res.json(userData);
        } catch (e) {
            next(e);
        }
    }

    async deleteUser(req, res, next) {
        try {
            const { password } = req.body;
            const userId = req.user.id;

            await userService.deleteUser(userId, password);

            return res.json({ success: true, message: 'Account deleted successfully' });
        } catch (e) {
            next(e);
        }
    }

    // GET /api/users/:identifier (by id or login)
    async getUserByIdentifier(req, res, next) {
        try {
            const { identifier } = req.params;
            const user = await userService.findByIdentifier(identifier);
            if (!user) {
                return next(ApiError.NotFoundError('User not found'));
            }
            return res.json(user);
        } catch (e) {
            next(e);
        }
    }
    // POST /api/users/:id/follow
    async follow(req, res, next) {
        try {
            const myId = req.user.id;
            const { id: targetId } = req.params;
            await userService.followUser(myId, targetId);
            return res.json({ success: true });
        } catch (e) {
            next(e);
        }
    }

    // DELETE /api/users/:id/follow
    async unfollow(req, res, next) {
        try {
            const myId = req.user.id;
            const { id: targetId } = req.params;
            await userService.unfollowUser(myId, targetId);
            return res.json({ success: true });
        } catch (e) {
            next(e);
        }
    }

    // GET /api/users/:id/followers
    async getFollowers(req, res, next) {
        try {
            const { id: targetId } = req.params;
            const followers = await userService.getFollowers(targetId);
            return res.json(followers);
        } catch (e) {
            next(e);
        }
    }

    // GET /api/users/me/following
    async getFollowing(req, res, next) {
        try {
            const myId = req.user.id;
            const following = await userService.getFollowing(myId);
            return res.json(following);
        } catch (e) {
            next(e);
        }
    }

    // GET /api/users/:id/is-following
    async isFollowing(req, res, next) {
        try {
            const myId = req.user.id;
            const { id: targetId } = req.params;
            const result = await userService.isFollowing(myId, targetId);
            return res.json({ isFollowing: result });
        } catch (e) {
            next(e);
        }
    }
}

export default new UserController();
