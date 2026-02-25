import bcrypt from 'bcrypt';
import UserDto from '../dtos/user-dto.js';
import tokenService from './token-service.js';
import userService from './user-service.js';
import roleService from './role-service.js';
import ApiError from '../exceptions/api-error.js';
import securityLogger from './security-logger.js';

class AuthService {
    async createSession(user) {
        const userDto = new UserDto(user);
        const tokens = tokenService.generateSessionTokens({ ...userDto });
        await tokenService.saveToken(userDto.id, tokens.refreshToken, 'refresh');
        return { ...tokens, user: userDto };
    }

    /**
     * Авторизация пользователя по логину/email и паролю.
     *
     * Определяет, является ли переданный идентификатор email или логином,
     * ищет пользователя в базе, проверяет совпадение пароля и генерирует
     * JWT-токены для сессии (access и refresh).
     * Также меняет идентификатор роли на её название.
     *
     * @async
     * @param {string} identifier - Email или логин пользователя.
     * @param {string} password - Пароль пользователя.
     * @returns {Promise<{ accessToken: string, refreshToken: string, user: UserDto }>}
     * Объект с токенами и DTO пользователя.
     *  - user: {UserDto} DTO пользователя,
     *  - accessToken: {string} JWT для доступа,
     *  - refreshToken: {string} JWT для обновления сессии.
     * @throws {ApiError.BadRequest} Если пользователь не найден или пароль неверен.
     *
     * @example
     * try {
     *   const userData = await userService.login("user@example.com", "mypassword");
     *   console.log(userData.accessToken);
     * } catch (e) {
     *   console.error(e.message);
     * }
     */
    async login(identifier, password) {
        const emailRegex = new RegExp(
            /^[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/,
        );
        const isEmail = emailRegex.test(identifier.toLowerCase());

        const user = isEmail
            ? await userService.findOneBy({ email_lower: identifier.toLowerCase() })
            : await userService.findOneBy({ login: identifier.toLowerCase() });

        // Унифицированное сообщение для предотвращения user enumeration
        // Атакующий не должен знать, существует ли email/username
        if (!user) {
            throw ApiError.BadRequest('Invalid credentials');
        }

        if (user.isDeleted) {
            // Также унифицируем - удалённый аккаунт = невалидные данные
            throw ApiError.BadRequest('Invalid credentials');
        }

        const isPassEquals = await bcrypt.compare(password, user.passwordHash);
        if (!isPassEquals) {
            throw ApiError.BadRequest('Invalid credentials');
        }
        const role = await roleService.findOneBy({ _id: user.roleId });
        user.roleId = role;
        const userDto = new UserDto(user);
        const tokens = tokenService.generateSessionTokens({ ...userDto });
        await tokenService.saveToken(userDto.id, tokens.refreshToken);

        return { ...tokens, user: userDto };
    }

    /**
     * Выход пользователя из системы.
     *
     * Удаляет указанный refresh-токен из базы данных, чтобы завершить сессию.
     *
     * @async
     * @param {string} refreshToken - Refresh-токен пользователя.
     * @returns {Promise<Object|null>} Возвращает объект удалённого токена или null, если токен не найден.
     *
     * @throws {ApiError} В случае проблем с удалением токена.
     *
     * @example
     * try {
     *   const result = await userService.logout(userRefreshToken);
     *   console.log("Токен удалён:", result);
     * } catch (e) {
     *   console.error(e.message);
     * }
     */
    async logout(refreshToken) {
        return await tokenService.removeToken(refreshToken);
    }

    /**
     * Обновление сессии пользователя.
     *
     * Валидирует переданный refresh-токен.
     * Достает из него информацию о пользователе. Ищет токен в базе данных.
     * Создаёт новые access и refresh токены
     * Сохраняет новый refresh-токен в базе данных и возвращает их вместе с данными пользователя.
     *
     * @async
     * @param {string} refreshToken - Текущий refresh-токен пользователя.
     * @returns {Promise<{accessToken: string, refreshToken: string, user: Object}>}
     *          Возвращает объект с новым access-токеном, refresh-токеном и DTO пользователя.
     *
     * @throws {ApiError.UnauthorizedError} Если refresh-токен отсутствует, недействителен или не найден в базе данных.
     *
     * @example
     * try {
     *   const userData = await userService.refresh(req.cookies.refreshToken);
     *   console.log(userData.accessToken);
     * } catch (e) {
     *   console.error(e.message);
     * }
     */
    async refresh(refreshToken) {
        if (!refreshToken) {
            throw ApiError.UnauthorizedError();
        }
        const userData = tokenService.validateRefreshToken(refreshToken);
        const tokenFromDb = await tokenService.findToken(refreshToken, 'refresh');
        if (!userData || !tokenFromDb) {
            throw ApiError.UnauthorizedError();
        }

        const user = await userService.findById(userData.id);
        // Загружаем роль пользователя из базы данных (аналогично методу login)
        const role = await roleService.findOneBy({ _id: user.roleId });
        user.roleId = role;
        const userDto = new UserDto(user);
        const tokens = tokenService.generateSessionTokens({ ...userDto });
        await tokenService.saveToken(userDto.id, tokens.refreshToken);
        return { ...tokens, user: userDto };
    }
}

export default new AuthService();
