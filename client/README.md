# Note Editor - Frontend Client

React приложение для веб-редактора заметок с поддержкой markdown и совместного редактирования в реальном времени.

## Технологический стек

- **React 19** с **TypeScript**
- **MobX** - управление состоянием
- **Milkdown** - markdown-редактор
- **Yjs** + **y-websocket** - синхронизация в реальном времени
- **React Router 7** - маршрутизация
- **Rspack** - быстрая сборка (альтернатива Webpack)
- **Axios** - HTTP клиент
- **CSS Modules** - модульная стилизация

## Требования

- Node.js 20+
- npm или yarn

## Установка и запуск

### Локальный запуск

1. **Установите зависимости:**
```bash
npm install
```

2. **Создайте `.env` файл** (опционально):
```env
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_WS_URL=ws://localhost:5000
REACT_APP_API_PORT=5000
REACT_APP_WS_PORT=5000
```

Если переменные не заданы, приложение автоматически определит API URL на основе текущего хоста.

3. **Запустите приложение в режиме разработки:**
```bash
npm start
```

Приложение откроется на http://localhost:3000

4. **Соберите production версию:**
```bash
npm run build
```

Собранные файлы будут в папке `build/`

### Запуск через Docker

См. основной README.md в корне проекта для инструкций по Docker Compose.

## Структура проекта

```
client/
├── public/              # Статические файлы
│   ├── index.html
│   ├── favicon.ico
│   └── manifest.json
│
├── src/
│   ├── components/      # React компоненты
│   │   ├── auth/        # Компоненты аутентификации
│   │   │   ├── Auth.tsx
│   │   │   ├── LoginForm.tsx
│   │   │   ├── RegisterForm.tsx
│   │   │   └── ForgotPasswordModal.tsx
│   │   │
│   │   ├── notes/       # Компоненты заметок
│   │   │   ├── MilkdownEditor.tsx    # Markdown редактор
│   │   │   ├── NoteViewer.tsx        # Просмотр заметок
│   │   │   ├── NoteCard.tsx          # Карточка заметки
│   │   │   ├── SplitEditNote.tsx     # Разделенный режим
│   │   │   └── hooks/                # Хуки для заметок
│   │   │       ├── useYjsConnection.ts
│   │   │       ├── useMarkdownSync.ts
│   │   │       └── useEditorHistory.ts
│   │   │
│   │   ├── sidebar/     # Боковая панель
│   │   │   ├── FileSidebar.tsx
│   │   │   └── FileSidebar/
│   │   │       ├── FileTree.tsx
│   │   │       ├── TreeNode.tsx
│   │   │       └── QuickActions.tsx
│   │   │
│   │   ├── modals/      # Модальные окна
│   │   │   ├── ShareModal.tsx
│   │   │   ├── InviteForm.tsx
│   │   │   └── LinkSharing.tsx
│   │   │
│   │   └── common/      # Общие компоненты
│   │       ├── layout/  # Компоненты макета
│   │       │   └── topbar/
│   │       │       ├── TopBar.tsx
│   │       │       ├── TopBarSearch.tsx
│   │       │       └── UserMenu.tsx
│   │       └── ui/      # UI компоненты
│   │           ├── Button.tsx
│   │           ├── Input.tsx
│   │           ├── Modal.tsx
│   │           └── Toast.tsx
│   │
│   ├── pages/           # Страницы приложения
│   │   ├── HomePage.tsx           # Главная страница
│   │   ├── NoteEditorPage.tsx    # Страница редактора
│   │   ├── ProfilePage.tsx       # Профиль пользователя
│   │   ├── PublicProfilePage.tsx  # Публичный профиль
│   │   ├── ModeratorDashboard.tsx # Панель модератора
│   │   ├── ActivationPage.tsx    # Активация аккаунта
│   │   └── ResetPasswordPage.tsx  # Сброс пароля
│   │
│   ├── stores/          # MobX сторы
│   │   ├── RootStore.ts
│   │   ├── authStore.ts
│   │   ├── notesStore.ts
│   │   └── sidebarStore.ts
│   │
│   ├── service/         # API сервисы
│   │   ├── AuthService.ts
│   │   ├── UserService.ts
│   │   ├── ModeratorService.ts
│   │   └── ...
│   │
│   ├── hooks/           # Кастомные React хуки
│   │   ├── useStores.ts
│   │   ├── useNoteYDoc.ts
│   │   ├── useModal.ts
│   │   └── useToast.ts
│   │
│   ├── http/            # HTTP клиент
│   │   └── index.ts     # Axios конфигурация с interceptors
│   │
│   ├── utils/           # Утилиты
│   │   ├── tokenStorage.ts
│   │   └── toastManager.ts
│   │
│   ├── contexts/        # React контексты
│   │   └── ToastContext.tsx
│   │
│   ├── models/          # TypeScript модели
│   │   ├── IUser.ts
│   │   └── response/
│   │
│   ├── types/           # TypeScript типы
│   │   └── notes.ts
│   │
│   ├── yjs/             # Yjs конфигурация
│   │   └── yjs-connector.js
│   │
│   ├── styles/          # Глобальные стили
│   │   ├── global.css
│   │   ├── reset.css
│   │   └── variables.css
│   │
│   ├── App.tsx          # Главный компонент
│   └── index.tsx        # Точка входа
│
├── Dockerfile           # Docker конфигурация
├── nginx.conf          # Nginx конфигурация для production
├── rspack.config.js    # Конфигурация Rspack
├── tsconfig.json       # TypeScript конфигурация
└── package.json
```

## Основные компоненты

### Редактор заметок

**MilkdownEditor** - основной markdown-редактор:
- Поддержка markdown синтаксиса
- Интеграция с Yjs для совместного редактирования
- История изменений (undo/redo)
- Автосохранение

**NoteViewer** - компонент просмотра и редактирования:
- Режимы: только чтение, редактирование, разделенный режим
- Синхронизация через WebSocket
- Отображение активных соавторов

### Боковая панель

**FileSidebar** - навигация по заметкам:
- Дерево файлов и папок
- Поиск заметок
- Быстрые действия (создание заметки/папки)
- Drag & drop для перемещения

### Система доступа

**ShareModal** - управление доступом:
- Приглашение пользователей
- Настройка прав (read/edit)
- Управление публичными ссылками
- Список соавторов

## Управление состоянием

Приложение использует **MobX** для управления состоянием:

- **authStore** - состояние аутентификации, данные пользователя
- **notesStore** - кэш заметок, выбранная заметка
- **sidebarStore** - состояние боковой панели, дерево файлов

## Маршрутизация

Приложение использует **React Router**:

- `/` - главная страница / форма входа
- `/note/:noteId` - редактирование заметки
- `/profile` - профиль пользователя
- `/user/:userId` - публичный профиль
- `/moderator` - панель модератора
- `/activate/:token` - активация аккаунта
- `/password/reset/:token` - сброс пароля

## API интеграция

HTTP клиент настроен через **Axios**:

- Автоматическое добавление JWT токена в заголовки
- Автоматическое обновление токена при истечении
- Централизованная обработка ошибок
- Toast уведомления для ошибок

## Совместное редактирование

Приложение использует **Yjs** для синхронизации в реальном времени:

- WebSocket соединение для каждого открытого документа
- Автоматическая синхронизация изменений
- Отображение активных пользователей
- Конфликт-фри синхронизация через CRDT

## Основные функции

### Редактор
- Markdown форматирование
- Автосохранение
- История изменений
- Совместное редактирование
- Подсчет слов

### Управление заметками
- Создание, редактирование, удаление
- Организация в папки
- Поиск по содержимому
- Избранное
- Публичные заметки

### Доступ
- Приглашение пользователей
- Публичные ссылки
- Права доступа (read/edit)
- Модерация контента

## Стилизация

- **CSS Modules** - модульная стилизация компонентов
- **CSS Variables** - глобальные переменные для тем
- **Responsive Design** - адаптивная верстка

## Production сборка

### Docker

Приложение собирается в multi-stage Docker образ:
1. **Builder stage** - сборка React приложения через Rspack
2. **Production stage** - Nginx для раздачи статики

### Nginx конфигурация

- SPA роутинг (все запросы на index.html)
- Gzip сжатие
- Кэширование статических файлов
- Security headers

## Скрипты

- `npm start` - запуск dev сервера (Rspack)
- `npm run build` - production сборка
- `npm test` - запуск тестов

## Безопасность

- JWT токены хранятся в localStorage/sessionStorage
- Refresh токены в httpOnly cookies
- Автоматическое обновление токенов
- Защищенные роуты через ProtectedRoute
- Валидация форм на клиенте

## Дополнительная документация

- Основной README: `../README.md`
- Backend README: `../server/README.md`
- Docker настройка: `../DOCKER-SETUP.md`

