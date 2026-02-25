import bcrypt from 'bcrypt';
import tokenService from './token-service.js';
import roleService from './role-service.js';
import UserDto from '../dtos/user-dto.js';
import ApiError from '../exceptions/api-error.js';
import { userRepository } from '../repositories/index.js';

class UserService {
    async createUser({email, login, password}) {
        const hashPassword = await bcrypt.hash(password, 10);
        const role = await roleService.findOneBy({ name: "user" });
        
        return await userRepository.create({
            email,
            email_lower: email.toLowerCase(), 
            login: login.toLowerCase(), 
            passwordHash: hashPassword,
            name: login,
            about: '',
            roleId: role._id
        });
    }

    async updateUser(userId, updateData) {
        const allowedFields = ['name', 'login', 'about'];
        for (const key of Object.keys(updateData)) {
            if (!allowedFields.includes(key)) {
                delete updateData[key];
            }
        }

        const allowedUniqueFields = ['login'];
        for (const field of allowedUniqueFields) {
            if (updateData[field] !== undefined) {
                const isUnique = await userRepository.isFieldUnique(field, updateData[field], userId);
                if (!isUnique) {
                    throw ApiError.BadRequest(`Поле "${field}" уже занято`);
                }
            }
        }        

        const updatedUser = await userRepository.updateByIdAtomic(userId, updateData);
        if (!updatedUser) {
            throw ApiError.BadRequest('User is not found');
        }
        return new UserDto(updatedUser);
    }

    async deleteUser(userId, password) {
        const user = await userRepository.findById(userId);
        if (!user) throw ApiError.BadRequest('User not found');

        const isValid = await bcrypt.compare(password, user.passwordHash);
        if (!isValid) throw ApiError.BadRequest('Password is incorrect');

        await userRepository.softDelete(userId);

        await tokenService.removeTokensByUserId(userId);

        return true;
    }

    async save(user) {
        return await userRepository.save(user);
    }

    /**
 * Получение списка всех пользователей.
 *
 * Выполняет выборку всех пользователей из базы данных.
 *
 * @async
 * @returns {Promise<Array<Object>>} Массив объектов пользователей (моделей или DTO).
 *
 * @throws {Error} В случае ошибки при запросе к базе данных.
 *
 * @example
 * try {
 *   const users = await userService.getAllUsers();
 *   console.log(users);
 * } catch (e) {
 *   console.error(e.message);
 * }
 */
    async getAllUsers() {
        const users = await userRepository.findAll();
        return users;
    }

    /**
 * Регистрация нового пользователя.
 *
 * Создаёт пользователя с указанным email, логином и паролем, 
 * хеширует пароль, присваивает стандартную роль, генерирует токены доступа и активации,
 * сохраняет их в базе и отправляет письмо с активацией.
 *
 * @async
 * @param {string} email - Email пользователя. Должен быть уникальным.
 * @param {string} login - Логин пользователя. Должен быть уникальным.
 * @param {string} password - Пароль пользователя в открытом виде.
 * @returns {Promise<Object>} Возвращает объект с данными пользователя и токенами:
 *  - user: {UserDto} DTO пользователя,
 *  - accessToken: {string} JWT для доступа,
 *  - refreshToken: {string} JWT для обновления сессии.
 *
 * @throws {ApiError.BadRequest} Если email или логин уже существует.
 * @throws {Error} При других ошибках при работе с базой или сервисами.
 *
 * @example
 * const userData = await userService.registration(
 *   "example@mail.com", 
 *   "myLogin", 
 *   "myPassword123"
 * );
 */
    async registration(email, login, password) { 
        const candidateByEmail = await userRepository.findOneBy({email_lower: email.toLowerCase()});
        const candidateByUsername = await userRepository.findOneBy({login: login.toLowerCase()});
        if (candidateByEmail !== null) {
            throw ApiError.BadRequest(`User with email ${email} already exists`);
        }
        if (candidateByUsername !== null) {
            throw ApiError.BadRequest(`User with login ${login} already exists`);
        }
        const user = await this.createUser({ email, login, password })   
        
        const userDto = new UserDto(user);
        const tokens = tokenService.generateSessionTokens({ ...userDto });
        
        await tokenService.saveToken(userDto.id, tokens.refreshToken, 'refresh');

        return {
            ...tokens,
            user: userDto
        }
    }

    async findOneBy(filter) {
        return await userRepository.findOneBy(filter);
    }

    async findById(id) {
        return await userRepository.findById(id);
    }

    /**
     * Найти пользователя по ID или login
     * @param {string} identifier - ID пользователя или login
     * @returns {Promise<UserDto|null>} DTO пользователя или null
     */
    async findByIdentifier(identifier) {
        // Проверяем, является ли identifier ObjectId (24 символа hex)
        const isObjectId = /^[0-9a-fA-F]{24}$/.test(identifier);
        
        if (isObjectId) {
            // Пытаемся найти по ID
            const userById = await userRepository.findById(identifier);
            if (userById) {
                return new UserDto(userById);
            }
        }
        
        // Если не найден по ID или identifier не похож на ObjectId, ищем по login
        const userByLogin = await userRepository.findOneBy({ login: identifier.toLowerCase() });
        if (userByLogin) {
            return new UserDto(userByLogin);
        }
        
        return null;
    }
}

export default new UserService();