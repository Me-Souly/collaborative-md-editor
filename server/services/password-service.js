import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcrypt';
import ApiError from '../exceptions/api-error.js';
import mailService from './mail-service.js';
import tokenService from './token-service.js';
import userService from './user-service.js';

class PasswordService {
    async requestReset(email) {
        const user = await userService.findOneBy({ email_lower: email.toLowerCase() })
        if (!user) throw ApiError.BadRequest(`User with email ${email} is not found`);

        const resetToken = uuidv4();

        const token = await tokenService.saveToken(
            user.id,
            resetToken,
            'reset'
        );

        // отправляем письмо
        const clientUrl = process.env.CLIENT_URL || 'http://localhost:3000';
        const resetLink = `${clientUrl}/password/reset/${resetToken}`;
        mailService.sendResetMail(email, resetLink)
            .catch(err => console.error('Error occured while send mail', err));

        return token;
    }
    
    async validateResetToken(tokenString) {
        const token = await tokenService.validateLinkToken(tokenString, 'reset');
        const user = await userService.findById(token.userId || token.tokenId);

        if (!user) throw ApiError.BadRequest('Invalid reset token');

        return true;
    }

    async resetPassword(tokenString, newPassword) {
        const token = await tokenService.validateLinkToken(tokenString, 'reset');
        if (!token) throw ApiError.BadRequest('Invalid or expired reset token');

        const user = await userService.findById(token.userId || token.tokenId);
        if (!user) throw ApiError.BadRequest('User not found for this token');

        
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        user.passwordHash = hashedPassword;
        await userService.save(user);

        await tokenService.removeToken(token.token);

        return true;
    }

    async changePassword(userId, oldPassword, newPassword) {
        const user = await userService.findById(userId);
        if (!user) throw ApiError.BadRequest("User not found");
  
        const isValid = await bcrypt.compare(oldPassword, user.passwordHash);
        if (!isValid) throw ApiError.BadRequest("Old password is incorrect");
        
        user.passwordHash = await bcrypt.hash(newPassword, 10);
        await userService.save(user);

        return true;
    }

}

export default new PasswordService();