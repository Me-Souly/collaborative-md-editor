import BaseRepository from './base-repository.js';

class TokenRepository extends BaseRepository {
    async findRefreshToken(_refreshToken) {
        throw new Error('Not implemented');
    }
    async findResetToken(_resetToken) {
        throw new Error('Not implemented');
    }
    async findActivationToken(_activationToken) {
        throw new Error('Not implemented');
    }
    async deleteToken(_token) {
        throw new Error('Not implemented');
    }
    async removeTokensByUserId(_userId) {
        throw new Error('Not implemented');
    }
    async deleteExpiredTokens() {
        throw new Error('Not implemented');
    }
    async saveTokenAtomic(_userId, _token, _type, _expiresAt) {
        throw new Error('Not implemented');
    }
}

export default TokenRepository;
