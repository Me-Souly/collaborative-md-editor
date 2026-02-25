# Note Editor - Backend Server

Backend сервер для веб-редактора заметок с поддержкой совместного редактирования в реальном времени.

## Технологический стек

- **Node.js 20+** с **Express 5**
- **MongoDB 7.0** - база данных для хранения заметок, пользователей и метаданных
- **Redis 7** - кэширование и управление сессиями
- **Yjs** - синхронизация документов в реальном времени
- **WebSocket** - real-time коммуникация для совместного редактирования
- **JWT** - аутентификация и авторизация
- **Mongoose** - ODM для MongoDB
- **Nodemailer** - отправка email (активация, восстановление пароля)
- **bcrypt** - хеширование паролей

## Требования

- Node.js 20+
- MongoDB 7.0+ (или Docker контейнер)
- Redis 7+ (или Docker контейнер)

## Установка и запуск

### Локальный запуск

1. **Установите зависимости:**
```bash
npm install
```

2. **Создайте `.env` файл** в корне проекта (см. `env.example.txt` в корне репозитория)

3. **Настройте переменные окружения:**
```env
# База данных
DB_URL=mongodb://admin:password@localhost:27017/notes_db?authSource=admin
MONGO_ROOT_USERNAME=admin
MONGO_ROOT_PASSWORD=password
MONGO_DATABASE=notes_db

# Redis
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=

# JWT
JWT_ACCESS_SECRET=your_access_secret_min_32_chars
JWT_REFRESH_SECRET=your_refresh_secret_min_32_chars
JWT_ACCESS_EXPIRES=15m
JWT_REFRESH_EXPIRES=7d

# SMTP (для email)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASSWORD=your_app_password

# CORS
CLIENT_URL=http://localhost:3000
API_URL=http://localhost:5000

# Модератор (создается при первом запуске)
MODERATOR_EMAIL=moderator@example.com
MODERATOR_LOGIN=moderator
MODERATOR_PASSWORD=secure_password
```

4. **Запустите сервер:**
```bash
npm run dev
```

Сервер запустится на порту 5000 (или порту, указанному в `PORT`)

### Запуск через Docker

См. основной README.md в корне проекта для инструкций по Docker Compose.

## Структура проекта

```
server/
├── config/              # Конфигурация (инициализация БД)
│   └── init-db.js
│
├── controllers/         # HTTP контроллеры (обработка запросов)
│   ├── auth-controller.js
│   ├── user-controller.js
│   ├── note-controller.js
│   ├── folder-controller.js
│   ├── note-access-controller.js
│   ├── password-controller.js
│   ├── activation-controller.js
│   └── comment-controller.js
│
├── services/           # Бизнес-логика
│   ├── auth-service.js
│   ├── user-service.js
│   ├── note-service.js
│   ├── folder-service.js
│   ├── note-access-service.js
│   ├── password-service.js
│   ├── activation-service.js
│   ├── mail-service.js
│   ├── token-service.js
│   ├── redis-service.js
│   └── ...
│
├── repositories/       # Слой доступа к данным
│   ├── base/          # Базовые репозитории
│   └── mongo/        # MongoDB реализации
│
├── models/            # Mongoose модели
│   └── mongo/
│       ├── user-model.js
│       ├── note-model.js
│       ├── folder-model.js
│       ├── token-model.js
│       └── ...
│
├── middlewares/       # Express middleware
│   ├── auth-middleware.js
│   ├── activated-middleware.js
│   ├── moderator-middleware.js
│   ├── check-user-active-middleware.js
│   └── error-middleware.js
│
├── router/            # Маршруты API
│   └── index.js
│
├── yjs/               # Yjs WebSocket сервер
│   ├── yjs-server.js
│   ├── yjs-doc-registry.js
│   ├── yjs-doc-loader.js
│   └── yjs-storage.js
│
├── dtos/              # Data Transfer Objects
├── exceptions/        # Кастомные исключения
├── index.js           # Точка входа
├── Dockerfile
└── package.json
```

## API Endpoints

### Health Check
- `GET /api/health` - проверка работоспособности сервера

### Аутентификация
- `POST /api/login` - вход в систему
- `POST /api/logout` - выход из системы
- `POST /api/refresh` - обновление access токена

### Пользователи
- `POST /api/users/registration` - регистрация нового пользователя
- `GET /api/users` - получить список пользователей (требует авторизации)
- `GET /api/users/:identifier` - получить пользователя по ID/login/email
- `PATCH /api/users/me` - обновить свой профиль
- `DELETE /api/users/me` - удалить свой аккаунт

### Активация аккаунта
- `GET /api/activate/:token` - активация аккаунта по токену
- `POST /api/activation/resend` - повторная отправка письма активации

### Пароли
- `POST /api/password/change` - изменить пароль (требует авторизации)
- `POST /api/password/request-reset` - запрос сброса пароля
- `GET /api/password/reset/:token` - валидация токена сброса
- `POST /api/password/reset` - сброс пароля по токену

### Папки
- `GET /api/folders` - получить все папки пользователя
- `GET /api/folders/:id` - получить папку по ID
- `POST /api/folders` - создать папку
- `PUT /api/folders/:id` - обновить папку
- `DELETE /api/folders/:id` - удалить папку

### Заметки
- `GET /api/notes` - получить все заметки пользователя
- `GET /api/notes/shared` - получить заметки, к которым есть доступ
- `GET /api/notes/public` - получить публичные заметки
- `GET /api/notes/:id` - получить заметку по ID
- `POST /api/notes` - создать заметку
- `PUT /api/notes/:id` - обновить заметку
- `DELETE /api/notes/:id` - удалить заметку
- `PATCH /api/notes/:id/restore` - восстановить удаленную заметку
- `GET /api/folders/:id/notes` - получить заметки в папке
- `GET /api/notes/:id/presence` - получить список активных пользователей в заметке
- `GET /api/search/notes` - поиск по своим заметкам
- `GET /api/search/notes/public` - поиск по публичным заметкам

### Доступ к заметкам
- `GET /api/notes/:id/access` - получить список пользователей с доступом
- `POST /api/notes/:id/access` - предоставить доступ пользователю
- `PATCH /api/notes/:id/access/:userId` - изменить права доступа
- `DELETE /api/notes/:id/access/:userId` - удалить доступ

### Публичные ссылки
- `POST /api/notes/:id/share-link` - создать публичную ссылку
- `GET /api/notes/:id/share-links` - получить список публичных ссылок
- `GET /api/share-link/:token/info` - получить информацию о ссылке
- `POST /api/share-link/connect` - подключиться по публичной ссылке
- `DELETE /api/share-link/:token` - удалить публичную ссылку

### Комментарии
- `GET /api/notes/:noteId/comments` - получить комментарии к заметке
- `POST /api/notes/:noteId/comments` - создать комментарий
- `DELETE /api/comments/:commentId` - удалить комментарий
- `POST /api/comments/:commentId/react` - добавить реакцию к комментарию

### Модерация
- `GET /api/moderator/public-notes` - получить публичные заметки для модерации
- `DELETE /api/moderator/notes/:id` - удалить заметку (модератор)
- `POST /api/moderator/notes/:id/block` - заблокировать заметку

## Аутентификация

Сервер использует JWT (JSON Web Tokens) для аутентификации:

- **Access Token** - короткоживущий токен (по умолчанию 15 минут), передается в заголовке `Authorization: Bearer <token>`
- **Refresh Token** - долгоживущий токен (по умолчанию 7 дней), хранится в httpOnly cookie

При истечении access токена клиент должен отправить запрос на `/api/refresh` для получения нового токена.

## WebSocket (Yjs)

Сервер поддерживает WebSocket соединения для совместного редактирования через Yjs:

- WebSocket сервер запускается на том же порту, что и HTTP сервер
- Подключение: `ws://localhost:5000` (или `wss://` для HTTPS)
- Протокол: Yjs WebSocket Provider
- Авторизация через JWT токен в query параметре: `?token=<access_token>`

## База данных

### MongoDB

Основные коллекции:
- **users** - пользователи
- **notes** - заметки
- **folders** - папки
- **tokens** - токены активации и сброса пароля
- **sharedLinks** - публичные ссылки
- **comments** - комментарии к заметкам
- **roles** - роли пользователей

### Redis

Используется для:
- Кэширования данных
- Хранения сессий
- Управления временными данными

## Middleware

- **authMiddleware** - проверка JWT токена
- **activatedMiddleware** - проверка активации аккаунта
- **moderatorMiddleware** - проверка прав модератора
- **checkUserActive** - проверка активности пользователя
- **errorMiddleware** - обработка ошибок

## Логирование

Сервер логирует:
- Все входящие HTTP запросы (метод, URL, body)
- Подключения к MongoDB и Redis
- Ошибки и исключения
- WebSocket соединения

## Docker

См. `Dockerfile` для конфигурации Docker образа. Сервер автоматически:
- Подключается к MongoDB и Redis
- Инициализирует базу данных (создает роли и модератора)
- Настраивает Yjs WebSocket сервер
- Выполняет graceful shutdown при получении сигналов SIGTERM/SIGINT

## Безопасность

- Пароли хешируются с помощью bcrypt
- JWT токены с секретными ключами
- Refresh токены в httpOnly cookies
- CORS настроен для защиты от несанкционированных запросов
- Валидация входных данных через express-validator
- Проверка прав доступа на уровне middleware
