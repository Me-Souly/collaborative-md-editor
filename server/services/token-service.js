import jwt from 'jsonwebtoken';
import { tokenRepository } from '../repositories/index.js';
import ApiError from '../exceptions/api-error.js';

const getExpires = () => ({
    refresh: parseInt(process.env.JWT_REFRESH_EXPIRES_DAYS || '30') * 24 * 60 * 60 * 1000,
    reset: parseInt(process.env.RESET_TOKEN_EXPIRES_MINUTES || '60') * 60 * 1000,
    activation: parseInt(process.env.ACTIVATION_TOKEN_EXPIRES_DAYS || '7') * 24 * 60 * 60 * 1000,
});

class TokenService {
    /**
     * Генерирует пару JWT токенов: access и refresh.
     *
     * @param {Object} payload - Данные пользователя (обычно DTO), которые будут зашифрованы в токен.
     * @param {string} payload.id - Уникальный идентификатор пользователя.
     * @param {string} payload.email - Email пользователя.
     * @param {string} payload.login - Логин пользователя.
     * @param {string} payload.name - Имя пользователя.
     * @param {string} payload.role - Роль пользователя.
     * @param {boolean} payload.isActivated - Флаг активации аккаунта.
     * @returns {Object} Объект с двумя токенами:
     * @returns {string} return.accessToken - JWT с коротким сроком действия (для авторизации).
     * @returns {string} return.refreshToken - JWT с длинным сроком действия (для обновления сессии).
     *
     * @example
     * const tokens = generateSessionTokens(userDto);
     * console.log(tokens.accessToken);
     * console.log(tokens.refreshToken);
     */
    generateSessionTokens(payload) {
        const accessToken = jwt.sign(payload, process.env.JWT_ACCESS_SECRET, {
            expiresIn: process.env.JWT_ACCESS_EXPIRES,
        });
        const refreshToken = jwt.sign(payload, process.env.JWT_REFRESH_SECRET, {
            expiresIn: process.env.JWT_REFRESH_EXPIRES,
        });

        return {
            accessToken,
            refreshToken,
        };
    }

    /**
     * Проверяет и расшифровывает JWT access токен.
     *
     * @param {string} token - JWT access токен, полученный от клиента.
     * @returns {Object|null} Возвращает payload токена (обычно DTO пользователя), если токен валиден,
     *                        иначе возвращает null.
     *
     * @example
     * const userData = validateAccessToken(accessToken);
     * if (!userData) {
     *     // токен не валиден или истёк
     * }
     */
    validateAccessToken(token) {
        try {
            const userData = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
            return userData;
        } catch {
            return null;
        }
    }

    /**
     * Проверяет и расшифровывает JWT refresh токен.
     *
     * @param {string} token - JWT refresh токен, полученный от клиента (обычно из cookies).
     * @returns {Object|null} Возвращает payload токена (обычно DTO пользователя), если токен валиден,
     *                        иначе возвращает null.
     *
     * @example
     * const userData = validateRefreshToken(refreshToken);
     * if (!userData) {
     *     // токен не валиден, пользователь нужно разлогинить
     * }
     */
    validateRefreshToken(token) {
        try {
            const userData = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
            return userData;
        } catch {
            return null;
        }
    }

    /**
     * Проверяет(удаляет) токен активации пользователя.
     *
     * @param {string} tokenString - Токен активации, обычно отправляемый по email.
     * @returns {Object|null} Возвращает объект токена из базы данных, если токен существует и не истёк,
     *                        иначе возвращает null.
     *
     * @example
     * const tokenData = await validateLinkToken(tokenString, type);
     * if (!tokenData) {
     *     // токен недействителен или истёк, показать ошибку
     * }
     */
    async validateLinkToken(tokenString, type) {
        const token = await tokenRepository.findOneBy({ token: tokenString, type });

        if (!token) throw ApiError.BadRequest(`Token not found ${tokenString}`);

        if (token.expiresAt < new Date()) {
            await tokenRepository.deleteToken(token);
            throw ApiError.BadRequest('Link expired');
        }
        return token;
    }

    // один пользователь - одно устройство
    /**
     * Сохраняет полученный токен пользователя в базе данных.
     *
     * @param {string} userId - ID пользователя, которому принадлежит токен.
     * @param {string} token - Строка токена (refresh, reset или activation).
     * @param {string} [type='refresh'] - Тип токена: 'refresh', 'reset' или 'activation'.
     * @returns {Promise<Object>} Возвращает созданный или обновлённый объект токена.
     *
     * @description
     * Если для пользователя уже существует токен указанного типа, он обновляется.
     * В противном случае создаётся новый токен с указанием даты создания и срока действия.
     *
     * @example
     * const savedToken = await saveToken(userId, newRefreshToken, 'refresh');
     */
    async saveToken(userId, token, type = 'refresh') {
        const EXPIRES = getExpires();
        const expiresAt = new Date(Date.now() + EXPIRES[type]);
        return await tokenRepository.saveTokenAtomic(userId, token, type, expiresAt);
    }

    /**
     * Удаляет токен из базы данных.
     *
     * @param {string} token - Строка токена для удаления.
     * @returns {Promise<Object>} Возвращает объект с информацией об удалённом токене (или результат удаления).
     *
     * @description
     * Используется для выхода пользователя или после использования одноразового токена
     * (например, для активации аккаунта или сброса пароля).
     *
     * @example
     * await removeToken(refreshToken);
     */
    async removeToken(token) {
        const tokenData = await tokenRepository.deleteToken(token);
        return tokenData;
    }

    async removeTokensByUserId(userId) {
        return await tokenRepository.removeTokensByUserId(userId);
    }

    async findToken(token, type) {
        const tokenData = await tokenRepository.findOneBy({ token: token, type: type });
        return tokenData;
    }
}

export default new TokenService();
