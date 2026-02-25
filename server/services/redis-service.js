// redis-service.js
import { createClient } from 'redis';

class RedisService {
    constructor() {
        this.client = null;
        this.isConnected = false;
        this.connectionAttempted = false;
        this.errorLogged = false;
    }

    async connect() {
        // Если Redis отключен через переменную окружения, не пытаемся подключаться
        if (process.env.REDIS_ENABLED === 'false') {
            console.log('[Redis] Redis disabled via REDIS_ENABLED=false');
            return;
        }

        if (this.isConnected && this.client) {
            return;
        }

        // Если уже пытались подключиться и не получилось, не пытаемся снова
        if (this.connectionAttempted && !this.isConnected) {
            return;
        }

        this.connectionAttempted = true;

        try {
            const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
            this.client = createClient({
                url: redisUrl,
            });

            this.client.on('error', (_err) => {
                // Логируем ошибку только один раз
                if (!this.errorLogged) {
                    console.warn(
                        '[Redis] ⚠ Redis connection failed. Application will work without cache.',
                    );
                    console.warn(
                        '[Redis] To enable Redis: install and start Redis server, or set REDIS_ENABLED=false',
                    );
                    this.errorLogged = true;
                }
                this.isConnected = false;
            });

            this.client.on('connect', () => {
                if (!this.errorLogged) {
                    console.log('[Redis] Connecting to Redis...');
                }
            });

            this.client.on('ready', () => {
                console.log('[Redis] ✓ Redis client ready');
                this.isConnected = true;
                this.errorLogged = false; // Сбрасываем флаг при успешном подключении
            });

            this.client.on('end', () => {
                console.log('[Redis] Connection ended');
                this.isConnected = false;
            });

            await this.client.connect();
        } catch {
            // Логируем ошибку только один раз
            if (!this.errorLogged) {
                console.warn(
                    '[Redis] ⚠ Redis connection failed. Application will work without cache.',
                );
                console.warn(
                    '[Redis] To enable Redis: install and start Redis server, or set REDIS_ENABLED=false',
                );
                this.errorLogged = true;
            }
            // Не блокируем работу приложения, если Redis недоступен
            this.isConnected = false;
            this.client = null;
            // НЕ пробрасываем ошибку наружу - приложение должно работать без Redis
        }
    }

    async disconnect() {
        if (this.client && this.isConnected) {
            try {
                await this.client.quit();
                this.isConnected = false;
                console.log('[Redis] Disconnected');
            } catch (error) {
                console.error('[Redis] Error disconnecting:', error);
            }
        }
    }

    /**
     * Получить состояние Yjs документа из кэша
     * @param {string} noteId - ID заметки
     * @returns {Promise<Buffer|null>} Состояние документа или null, если не найдено
     */
    async getYjsState(noteId) {
        if (!this.isConnected || !this.client) {
            return null;
        }

        try {
            const key = `yjs:doc:${noteId}`;
            const state = await this.client.getBuffer(key);
            if (state) {
                return Buffer.from(state);
            }
            return null;
        } catch (error) {
            console.error(`[Redis] Error getting Yjs state for note ${noteId}:`, error);
            return null;
        }
    }

    /**
     * Сохранить состояние Yjs документа в кэш
     * @param {string} noteId - ID заметки
     * @param {Buffer|Uint8Array} state - Состояние документа
     * @param {number} ttl - Время жизни в секундах (по умолчанию 1 час)
     */
    async setYjsState(noteId, state, ttl = 3600) {
        if (!this.isConnected || !this.client) {
            return;
        }

        try {
            const key = `yjs:doc:${noteId}`;
            // Преобразуем в Buffer для хранения
            const buffer = Buffer.isBuffer(state) ? state : Buffer.from(state);
            await this.client.setEx(key, ttl, buffer);
            console.log(`[Redis] ✓ Cached Yjs state for note ${noteId} (TTL: ${ttl}s)`);
        } catch (error) {
            console.error(`[Redis] Error setting Yjs state for note ${noteId}:`, error);
        }
    }

    /**
     * Удалить состояние Yjs документа из кэша
     * @param {string} noteId - ID заметки
     */
    async deleteYjsState(noteId) {
        if (!this.isConnected || !this.client) {
            return;
        }

        try {
            const key = `yjs:doc:${noteId}`;
            await this.client.del(key);
            console.log(`[Redis] ✓ Deleted Yjs state cache for note ${noteId}`);
        } catch (error) {
            console.error(`[Redis] Error deleting Yjs state for note ${noteId}:`, error);
        }
    }

    /**
     * Проверить, существует ли состояние в кэше
     * @param {string} noteId - ID заметки
     * @returns {Promise<boolean>}
     */
    async hasYjsState(noteId) {
        if (!this.isConnected || !this.client) {
            return false;
        }

        try {
            const key = `yjs:doc:${noteId}`;
            const exists = await this.client.exists(key);
            return exists === 1;
        } catch (error) {
            console.error(`[Redis] Error checking Yjs state for note ${noteId}:`, error);
            return false;
        }
    }
}

export default new RedisService();
