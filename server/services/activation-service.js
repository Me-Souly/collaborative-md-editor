import { v4 as uuidv4 } from 'uuid';
import ApiError from '../exceptions/api-error.js';
import tokenService from './token-service.js';
import mailService from './mail-service.js';
import userService from './user-service.js';


class ActivationService {
    async createActivation(user) {
        if (!user?.email || !user?.id) {
            throw ApiError.BadRequest('Uncorrect User data');
        }

        const activationToken = uuidv4();

        const token = await tokenService.saveToken(
            user.id,
            activationToken,
            'activation'
        );

        // отправляем письмо
        const clientUrl = process.env.CLIENT_URL || 'http://localhost:3000';
        const activationLink = `${clientUrl}/activate/${activationToken}`;
        mailService.sendActivationMail(user.email, activationLink)
            .catch(err => console.error('Error occured while send mail', err));
        

        return token;        
    }

    async activate(tokenString) {
        const token = await tokenService.validateLinkToken(tokenString, 'activation');

        const user = await userService.findById(token.userId);
        if (!user) throw ApiError.BadRequest('Incorrect activation string');

        user.isActivated = true;
        await userService.save(user);
        
        await tokenService.removeToken(token.token);
    }
}

export default new ActivationService();