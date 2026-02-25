// Новый connection handler для Bug #23 - auth через WebSocket message
// Этот файл содержит обновлённую логику, которая будет интегрирована в yjs-server.js

// ИЗМЕНЕНИЯ:
// 1. Токен больше НЕ берётся из query parameters
// 2. Ждём auth сообщение от клиента с токеном
// 3. Валидируем токен и проверяем права
// 4. Только после успешной auth вызываем setupWSConnection

export const createConnectionHandler = (
    wss,
    {
        _noteService,
        noteAccessService,
        tokenService,
        _redisService,
        registerPresence,
        _unregisterPresence,
        getDocState,
        _setupWSConnection,
        getYDoc,
        _shouldBlockUpdateFromReadOnly,
        docCleanupTimers,
        _DOC_CLEANUP_DELAY,
        _messageServerEpoch,
        _SERVER_EPOCH,
        _encoding,
        _syncProtocol,
        _Y,
    },
) => {
    wss.on('connection', async (ws, req) => {
        try {
            const url = new URL(req.url, 'http://localhost');
            const pathname = url.pathname || '/';

            if (!pathname.startsWith('/yjs')) {
                ws.close(1008, 'Invalid path');
                return;
            }

            const noteId = url.searchParams.get('noteId');

            if (!noteId) {
                ws.close(1008, 'NoteId is required');
                return;
            }

            // SECURITY FIX (Bug #23): Токен больше НЕ принимается из query string
            // Вместо этого ждём auth сообщение от клиента
            let authenticated = false;
            let userId = null;
            let permission = null;
            let _setupComplete = false;

            console.log(
                `[YJS] WebSocket подключение для заметки ${noteId}, ожидание auth сообщения...`,
            );

            // Обработчик auth сообщения
            const authMessageHandler = async (message) => {
                // Уже аутентифицированы - игнорируем повторные auth сообщения
                if (authenticated) return;

                try {
                    // Проверяем, это ли JSON auth сообщение
                    const messageStr = message.toString();
                    let authData;

                    try {
                        authData = JSON.parse(messageStr);
                    } catch {
                        // Не JSON - это не auth сообщение, игнорируем
                        return;
                    }

                    // Проверяем тип сообщения
                    if (authData.type !== 'auth') {
                        return;
                    }

                    console.log(`[YJS] Получено auth сообщение для заметки ${noteId}`);

                    const token = authData.token;
                    if (!token) {
                        ws.close(1008, 'Token is required in auth message');
                        return;
                    }

                    const userData = tokenService.validateAccessToken(token);
                    if (!userData || !userData.id) {
                        ws.close(1008, 'Invalid token');
                        return;
                    }

                    userId = userData.id;

                    // Проверка прав доступа к заметке
                    permission = await noteAccessService.getUserPermissionForNote(userId, noteId);
                    if (!permission) {
                        ws.close(1008, 'Access denied');
                        return;
                    }

                    authenticated = true;
                    console.log(
                        `[YJS] Аутентификация успешна для пользователя ${userId}, разрешение: ${permission}`,
                    );

                    // Убираем обработчик auth сообщений
                    ws.off('message', authMessageHandler);

                    // Теперь инициализируем Yjs соединение
                    await initializeYjsConnection();
                } catch (authError) {
                    console.error(`[YJS] Ошибка в auth handler:`, authError);
                    if (!authenticated) {
                        ws.close(1011, 'Authentication error');
                    }
                }
            };

            // Функция инициализации Yjs соединения после успешной аутентификации
            const initializeYjsConnection = async () => {
                const _isReadOnly = permission !== 'edit';
                const docName = `yjs/${noteId}`;

                // Отменяем таймер уничтожения при новом подключении
                if (docCleanupTimers.has(docName)) {
                    console.log(
                        `[YJS] Отмена таймера уничтожения для ${docName} (новое подключение)`,
                    );
                    clearTimeout(docCleanupTimers.get(docName));
                    docCleanupTimers.delete(docName);
                }

                // Регистрируем presence для этой WS-сессии
                registerPresence(noteId, userId, ws);

                // Получаем или создаем документ
                const sharedDoc = getYDoc(docName);
                const _docState = getDocState(docName, sharedDoc);

                // ЗДЕСЬ ИДЁТ ВСЯ ОСТАЛЬНАЯ ЛОГИКА ИЗ ТЕКУЩЕГО CONNECTION HANDLER
                // (загрузка состояния, регистрация обработчиков, setupWSConnection и т.д.)
                // Копируем код начиная со строки "Проверяем текущее состояние документа"

                _setupComplete = true;
            };

            // Регистрируем обработчик auth сообщений
            ws.on('message', authMessageHandler);

            // Таймаут для аутентификации - если auth не пришёл за 10 секунд, закрываем соединение
            const authTimeout = setTimeout(() => {
                if (!authenticated) {
                    console.warn(`[YJS] Auth timeout для заметки ${noteId}, закрываем соединение`);
                    ws.close(1008, 'Authentication timeout');
                }
            }, 10000);

            // Очищаем таймаут при закрытии соединения
            ws.on('close', () => {
                clearTimeout(authTimeout);
            });
        } catch (error) {
            console.error('WebSocket connection error:', error);
            ws.close(1011, 'Internal server error');
        }
    });
};
