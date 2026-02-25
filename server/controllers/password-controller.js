import { validationResult } from 'express-validator';
import { passwordService } from '../services/index.js';
import ApiError from '../exceptions/api-error.js';

class PasswordController {
    async requestReset(req, res, next) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return next(ApiError.BadRequest('Error while validation', errors.array()))
            }
            const { email } = req.body;
            await passwordService.requestReset(email);
            return res.json({ 
                success: true,
                message: 'Reset mail sent successfully'
            });
        } catch (e) {
            next(e);
        }
    }

    async validateReset(req, res, next) {
        try {
            const resetToken = req.params.token;
            await passwordService.validateResetToken(resetToken);

            return res.json({
                success: true,
                message: 'Reset token is valid. You can now set a new password.'
            });
        } catch (e) {
            next(e);
        }
    }

    async resetPassword(req, res, next) {
        try {
            const { token, newPassword } = req.body;

            if (!token || !newPassword) {
                return next(ApiError.BadRequest('Token and new password are required'));
            }

            await passwordService.resetPassword(token, newPassword);

            return res.json({
                success: true,
                message: 'Password has been successfully reset'
            });
        } catch (e) {
            next(e);
        }
    }

    async changePassword(req, res, next) {
        try {
            const userId = req.user.id;
            const { oldPassword, newPassword } = req.body;
            if (!oldPassword || !newPassword) {
                return next(ApiError.BadRequest('Old password and new password are required'));
            }

            await passwordService.changePassword(userId, oldPassword, newPassword);
            
            return res.json({
                success: true,
                message: 'Password has been successfully changed'
            })
        } catch (e) {
            next(e);
        }
    }
}

export default new PasswordController();