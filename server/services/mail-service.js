import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
dotenv.config();

class MailService {
    constructor() {
        this.transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: Number(process.env.SMTP_PORT),
            secure: false,
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASSWORD
            }
        });
    }

    /**
 * Отправляет пользователю письмо для активации аккаунта.
 *
 * @async
 * @param {string} to - Email адрес получателя.
 * @param {string} link - Ссылка для активации аккаунта.
 * @throws {Error} Бросает ошибку, если отправка письма не удалась.
 */
    async sendActivationMail(to, link) {
        await this.transporter.sendMail({
            from: process.env.SMTP_USER,
            to,
            subject: 'Account activation' + process.env.API_URL,
            text: '',
            html:
                `
                <div>
                    <h1>
                        Для активации перейдите по ссылке
                    </h1>
                    <a href="${link}">${link}</a>
                </div>
                `
        })
    }

    /**
 * Отправляет пользователю письмо для сброса пароля.
 *
 * @async
 * @param {string} to - Email адрес получателя.
 * @param {string} link - Ссылка для сброса пароля.
 * @throws {Error} Бросает ошибку, если отправка письма не удалась.
 */
    async sendResetMail(to, link) {
        await this.transporter.sendMail({
            from: process.env.SMTP_USER,
            to,
            subject: 'Сброс пароля',
            text: `Для сброса пароля перейдите по ссылке: ${link}`,
            html:
                `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <h1 style="color: #111827; font-size: 24px; margin-bottom: 16px;">
                        Сброс пароля
                    </h1>
                    <p style="color: #374151; font-size: 16px; line-height: 1.5; margin-bottom: 24px;">
                        Вы запросили сброс пароля для вашего аккаунта. Для установки нового пароля перейдите по ссылке ниже:
                    </p>
                    <div style="text-align: center; margin: 32px 0;">
                        <a href="${link}" 
                           style="display: inline-block; padding: 12px 24px; background: #1976d2; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 500;">
                            Сбросить пароль
                        </a>
                    </div>
                    <p style="color: #6b7280; font-size: 14px; line-height: 1.5; margin-top: 24px;">
                        Если вы не запрашивали сброс пароля, просто проигнорируйте это письмо.
                    </p>
                    <p style="color: #9ca3af; font-size: 12px; margin-top: 24px; padding-top: 24px; border-top: 1px solid #e5e7eb;">
                        Если кнопка не работает, скопируйте и вставьте эту ссылку в браузер:<br>
                        <a href="${link}" style="color: #1976d2; word-break: break-all;">${link}</a>
                    </p>
                </div>
                `
        })
    }
}

export default new MailService();