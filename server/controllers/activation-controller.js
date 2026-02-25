import activationService from '../services/activation-service.js';
import { userService } from '../services/index.js';
import ApiError from '../exceptions/api-error.js';

class ActivationController {
    // GET api/activate/:token
    async activate(req, res, next) {
        try {
            const activationToken = req.params.token;
            await activationService.activate(activationToken);
            // Редиректим на страницу активации с токеном для отображения успеха
            const clientUrl = process.env.CLIENT_URL || 'http://localhost:3000';
            return res.redirect(`${clientUrl}/activate/${activationToken}`)
        } catch (e) {
            next(e);
        }
    }

    // POST api/activation/resend
    async resendActivation(req, res, next) {
        try {
            const userId = req.user.id;
            const user = await userService.findById(userId);
            
            if (!user) {
                return next(ApiError.NotFoundError('User not found'));
            }

            if (user.isActivated) {
                return res.json({
                    success: true,
                    message: 'Account is already activated'
                });
            }

            await activationService.createActivation(user);
            
            return res.json({
                success: true,
                message: 'Activation email has been sent'
            });
        } catch (e) {
            next(e);
        }
    }
}

export default new ActivationController();