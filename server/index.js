import dotenv from 'dotenv';
dotenv.config();

import * as Sentry from '@sentry/node';

// Sentry инициализируется до всего остального, чтобы перехватывать все ошибки
if (process.env.SENTRY_DSN) {
    Sentry.init({
        dsn: process.env.SENTRY_DSN,
        environment: process.env.NODE_ENV || 'development',
        // Записываем 100% транзакций в development, 10% в production
        tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    });
    console.log('[Sentry] Initialized');
}

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import mongoose from 'mongoose';
import http from 'http';

import router from './router/index.js';
import errorMiddleware from './middlewares/error-middleware.js';
import initDatabase from './config/init-db.js';
import { roleRepository, userRepository } from './repositories/index.js';

// 1. === ИМПОРТИРУЕМ YJS-МОДУЛЬ ===
import { setupYjs, saveAllActiveDocs } from './yjs/yjs-server.js';
// 2. === ИМПОРТИРУЕМ REDIS-СЕРВИС ===
import redisService from './services/redis-service.js';
import securityLogger from './services/security-logger.js';

const PORT = process.env.PORT || 5000;
const app = express();

// --- middlewares ---
app.use(helmet());
app.use(express.json());
app.use(cookieParser());

// Логирование всех запросов для отладки (после парсинга body)
app.use((req, _res, next) => {
    console.log(`[Server] ${req.method} ${req.url}`);
    if (req.body && Object.keys(req.body).length > 0) {
        console.log(`[Server] Body:`, {
            ...req.body,
            password: req.body.password ? '***' : undefined,
        });
    }
    next();
});

// Настройка CORS — whitelist разрешённых origins
// В production задайте CLIENT_URL в .env (через запятую для нескольких доменов):
//   CLIENT_URL=https://yourdomain.com,https://www.yourdomain.com
const allowedOrigins = process.env.CLIENT_URL
    ? process.env.CLIENT_URL.split(',').map((url) => url.trim())
    : ['http://localhost:3000', 'http://localhost:3001'];

if (process.env.NODE_ENV === 'production') {
    console.log('[CORS] Production mode — allowed origins:', allowedOrigins);
}

app.use(
    cors({
        credentials: true,
        origin: (origin, callback) => {
            // Разрешаем запросы без origin (например, Postman, мобильные приложения)
            if (!origin) {
                return callback(null, true);
            }

            // Для разработки разрешаем все localhost порты и локальные IP-адреса
            if (process.env.NODE_ENV !== 'production') {
                if (
                    origin.startsWith('http://localhost:') ||
                    origin.startsWith('http://127.0.0.1:')
                ) {
                    return callback(null, true);
                }
                // Разрешаем запросы с локальных IP-адресов (для доступа с телефона в той же сети)
                // Проверяем, что это локальный IP (192.168.x.x, 10.x.x.x, 172.16-31.x.x)
                const localIpPattern =
                    /^http:\/\/(192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2[0-9]|3[0-1])\.\d+\.\d+):\d+$/;
                if (localIpPattern.test(origin)) {
                    return callback(null, true);
                }
            }

            // Проверяем whitelist разрешённых origins
            if (allowedOrigins.includes(origin)) {
                return callback(null, true);
            }

            securityLogger.corsRejected(origin);
            callback(new Error('Not allowed by CORS'));
        },
    }),
);
app.use('/api', router);
// Sentry должен перехватывать ошибки до нашего errorMiddleware
if (process.env.SENTRY_DSN) {
    Sentry.setupExpressErrorHandler(app);
}
app.use(errorMiddleware);

// --- инициализация ---
const start = async () => {
    initDatabase(roleRepository, userRepository);

    try {
        await mongoose.connect(process.env.DB_URL);
        console.log('MongoDB connected');

        // Подключаемся к Redis (неблокирующее подключение)
        // Если Redis недоступен, сервер все равно запустится
        // Используем Promise.race с таймаутом, чтобы не ждать бесконечно
        try {
            await Promise.race([
                redisService.connect(),
                new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('Redis connection timeout')), 3000),
                ),
            ]);
        } catch {
            console.warn('[Server] Redis connection failed or timed out, continuing without cache');
            // Продолжаем работу без Redis
        }

        // Создаем HTTP-сервер из Express-приложения
        const server = http.createServer(app);

        // 2. === ПЕРЕДАЕМ HTTP-СЕРВЕР В YJS-НАСТРОЙЩИК ===
        // Он сам создаст WebSocket-сервер (wss) и привяжет его к 'server'
        setupYjs(server);

        // Запускаем ОБЩИЙ сервер (HTTP + WS)
        // Слушаем на 0.0.0.0, чтобы быть доступным из локальной сети
        server.listen(PORT, '0.0.0.0', () => {
            console.log(`Server running on port ${PORT}`);
            console.log(`Server accessible at http://0.0.0.0:${PORT}`);
            console.log(`Local access: http://localhost:${PORT}`);
        });

        // Graceful shutdown: сохраняем все Yjs документы перед завершением
        const gracefulShutdown = async (signal) => {
            console.log(`\n[Shutdown] Получен сигнал ${signal}. Сохраняем все документы...`);

            // Закрываем сервер для новых подключений
            server.close(async () => {
                try {
                    // Сохраняем все активные Yjs документы
                    await saveAllActiveDocs();

                    // Закрываем соединение с БД
                    await mongoose.connection.close();
                    console.log('[Shutdown] MongoDB connection closed');

                    // Закрываем соединение с Redis
                    await redisService.disconnect();
                    console.log('[Shutdown] Redis connection closed');

                    console.log('[Shutdown] Сервер завершен корректно');
                    process.exit(0);
                } catch (err) {
                    console.error('[Shutdown] Ошибка при завершении:', err);
                    process.exit(1);
                }
            });

            // Таймаут на случай, если что-то зависнет
            setTimeout(() => {
                console.error('[Shutdown] Принудительное завершение после таймаута');
                process.exit(1);
            }, 10000); // 10 секунд
        };

        // Обработчики сигналов для graceful shutdown
        process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
        process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    } catch (e) {
        console.error(e);
    }
};

start();
