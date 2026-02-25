// yjs/yjs-connector.js
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { IndexeddbPersistence } from 'y-indexeddb';
import * as decoding from 'lib0/decoding';

// Типы сообщений (должны совпадать с сервером)
const messageServerEpoch = 100;

// Хранилище epoch по noteId (для определения перезапуска сервера)
const epochStore = new Map();

/**
 * Создает соединение YJS для заметки
 * @param {Object} options
 * @param {string} options.noteId - ID заметки
 * @param {string|null} options.token - JWT токен (null для гостевого доступа)
 * @param {string} options.wsUrl - URL WebSocket сервера (опционально)
 * @returns {Object} Объект с doc, provider, text и методом destroy
 */
function resolveWsHost(wsUrl) {
    // 1) env override
    if (wsUrl) return wsUrl;
    // 2) derive from current origin (works for phone in одной сети)
    if (typeof window !== 'undefined' && window.location) {
        const proto = window.location.protocol === 'https:' ? 'wss' : 'ws';
        const host = window.location.hostname;
        const port = process.env.REACT_APP_WS_PORT || '5000';
        return `${proto}://${host}:${port}`;
    }
    // 3) fallback
    return 'ws://localhost:5000';
}

export function createNoteConnection({ noteId, token, wsUrl }) {
    const doc = new Y.Doc();

    // IndexedDB persistence — только для авторизованных (гостям не кешируем)
    let idbPersistence = null;
    if (token) {
        idbPersistence = new IndexeddbPersistence(`note-${noteId}`, doc);
        idbPersistence.on('synced', () => {
            console.log(`[yjs-connector] IndexedDB state loaded for ${noteId}`);
        });
    }

    const host = resolveWsHost(wsUrl);
    const room = `yjs/${noteId}`;

    const provider = new WebsocketProvider(host, room, doc, {
        connect: true,
        params: {
            noteId,
        },
    });

    const text = doc.getText('content');
    const fragment = doc.getXmlFragment('prosemirror');
    console.log(`[yjs-connector] Создание соединения для заметки ${noteId}`);

    let authSent = false;
    const sendAuthMessage = () => {
        if (!provider.ws || authSent) return;

        try {
            // Формируем auth сообщение в формате JSON
            const authMessage = JSON.stringify({
                type: 'auth',
                token: token,
                noteId: noteId,
            });

            provider.ws.send(authMessage);
            authSent = true;
            console.log(`[yjs-connector] Auth сообщение отправлено для заметки ${noteId}`);
        } catch (e) {
            console.error(`[yjs-connector] Ошибка отправки auth сообщения:`, e);
        }
    };

    // Отправляем auth при первом подключении
    const authStatusHandler = (event) => {
        if (event.status === 'connected' && !authSent) {
            // Небольшая задержка, чтобы WebSocket полностью установился
            setTimeout(sendAuthMessage, 10);
        } else if (event.status === 'disconnected') {
            // Сбрасываем флаг при отключении, чтобы отправить auth при reconnect
            authSent = false;
        }
    };
    provider.on('status', authStatusHandler);

    // Обработка сообщений от сервера для определения epoch
    const handleEpochMessage = (message) => {
        try {
            const data =
                message instanceof ArrayBuffer
                    ? new Uint8Array(message)
                    : message instanceof Uint8Array
                      ? message
                      : null;

            if (!data || data.length === 0) return false;

            const decoder = decoding.createDecoder(data);
            const messageType = decoding.readVarUint(decoder);

            if (messageType === messageServerEpoch) {
                const serverEpoch = decoding.readVarString(decoder);
                console.log(`[yjs-connector] Получен server epoch: ${serverEpoch}`);

                const storedEpoch = epochStore.get(noteId);

                if (storedEpoch && storedEpoch !== serverEpoch) {
                    console.warn(
                        `[yjs-connector] ⚠ Сервер перезапустился! Старый epoch: ${storedEpoch}, новый: ${serverEpoch}`,
                    );
                    console.log(
                        `[yjs-connector] Перезагрузка страницы для корректной синхронизации...`,
                    );

                    // Сохраняем новый epoch перед перезагрузкой
                    epochStore.set(noteId, serverEpoch);

                    // Очищаем IndexedDB перед перезагрузкой, чтобы не было конфликтов
                    if (idbPersistence) {
                        idbPersistence
                            .clearData()
                            .then(() => {
                                window.location.reload();
                            })
                            .catch(() => {
                                window.location.reload();
                            });
                    } else {
                        window.location.reload();
                    }

                    return true;
                } else if (!storedEpoch) {
                    // Первое подключение - сохраняем epoch
                    console.log(
                        `[yjs-connector] Первое подключение, сохраняем epoch: ${serverEpoch}`,
                    );
                    epochStore.set(noteId, serverEpoch);
                }

                return true; // Сообщение обработано
            }
        } catch {
            // Игнорируем ошибки парсинга - это может быть обычное sync сообщение
        }
        return false;
    };

    // Перехватываем сообщения WebSocket для обработки epoch
    let epochHandlerAttached = false;
    const epochMessageListener = (event) => {
        handleEpochMessage(event.data);
    };

    const setupEpochHandler = () => {
        if (!provider.ws) {
            // WebSocket ещё не создан, ждём
            setTimeout(setupEpochHandler, 50);
            return;
        }

        if (epochHandlerAttached) return;

        // Используем addEventListener - не мешает y-websocket
        provider.ws.addEventListener('message', epochMessageListener);
        epochHandlerAttached = true;

        console.log(`[yjs-connector] Epoch handler установлен для заметки ${noteId}`);
    };

    // Устанавливаем epoch handler после подключения и переподключения
    let lastWs = null;
    const statusHandlerForEpoch = (event) => {
        if (event.status === 'connected') {
            // При каждом подключении (включая reconnect) проверяем, не создался ли новый WebSocket
            if (provider.ws !== lastWs) {
                // Удаляем listener со старого WebSocket
                if (lastWs && epochHandlerAttached) {
                    try {
                        lastWs.removeEventListener('message', epochMessageListener);
                    } catch {
                        /* ignore */
                    }
                }
                epochHandlerAttached = false;
                lastWs = provider.ws;
                // Небольшая задержка для инициализации WebSocket
                setTimeout(setupEpochHandler, 10);
            }
        }
    };
    provider.on('status', statusHandlerForEpoch);

    // Сохраняем ссылки на handlers для корректной отписки
    // Debounce для логирования, чтобы не спамить консоль при множественных sync событиях
    let lastStatusLog = 0;
    let lastSyncLog = 0;
    const LOG_DEBOUNCE = 2000; // 2 секунды между логами статуса

    // Отслеживание частых переподключений (после выхода из сна)
    let reconnectCount = 0;
    let lastReconnectTime = 0;
    const RECONNECT_WINDOW = 10000; // 10 секунд
    const MAX_RECONNECTS_IN_WINDOW = 5;

    const statusHandler = (event) => {
        const now = Date.now();

        // Отслеживаем частые переподключения
        if (event.status === 'connected') {
            if (now - lastReconnectTime < RECONNECT_WINDOW) {
                reconnectCount++;
                if (reconnectCount > MAX_RECONNECTS_IN_WINDOW) {
                    // Слишком много переподключений - временно отключаемся
                    console.warn(
                        `[yjs-connector] Слишком частые переподключения (${reconnectCount}), пауза 5 сек...`,
                    );
                    provider.disconnect();
                    setTimeout(() => {
                        console.log(`[yjs-connector] Возобновление подключения после паузы`);
                        reconnectCount = 0;
                        provider.connect();
                    }, 5000);
                    return;
                }
            } else {
                // Сброс счётчика, если прошло достаточно времени
                reconnectCount = 1;
            }
            lastReconnectTime = now;
        }

        // Логируем с debounce
        if (now - lastStatusLog > LOG_DEBOUNCE) {
            console.log(`[yjs-connector] Provider status: ${event.status}`);
            lastStatusLog = now;
        }
    };
    const syncHandler = (isSynced) => {
        const now = Date.now();
        if (now - lastSyncLog > LOG_DEBOUNCE) {
            console.log(`[yjs-connector] Provider sync: ${isSynced}`);
            if (isSynced) {
                const syncedText = text.toString();
                console.log(
                    `[yjs-connector] Текст после sync: длина = ${syncedText.length}, первые 50 символов: "${syncedText.substring(0, 50)}"`,
                );
            }
            lastSyncLog = now;
        }
    };

    // Логируем события provider
    if (provider && typeof provider.on === 'function') {
        provider.on('status', statusHandler);
        provider.on('sync', syncHandler);
    }

    return {
        doc,
        provider,
        text,
        fragment,
        idbPersistence,
        destroy() {
            console.log(`[yjs-connector] Уничтожение соединения для заметки ${noteId}`);

            // Отписываемся от событий перед уничтожением
            if (provider) {
                if (typeof provider.off === 'function') {
                    provider.off('status', statusHandler);
                    provider.off('sync', syncHandler);
                    provider.off('status', statusHandlerForEpoch);
                    provider.off('status', authStatusHandler);
                }
                provider.disconnect();
                if (typeof provider.destroy === 'function') {
                    provider.destroy();
                }
            }
            if (idbPersistence && typeof idbPersistence.destroy === 'function') {
                idbPersistence.destroy();
            }
            if (doc && typeof doc.destroy === 'function') {
                doc.destroy();
            }

            // Не удаляем epoch из хранилища - он нужен при повторном открытии заметки
            // epochStore.delete(noteId);
        },
    };
}
