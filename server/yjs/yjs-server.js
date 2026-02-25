// yjs-server.js
// ВАЖНО: используем require для yjs, чтобы был тот же экземпляр модуля, что и в y-websocket.
// Если использовать ESM import, ESM и CJS resolve разные экземпляры Y.Doc,
// и Y.applyUpdate из ESM не работает на WSSharedDoc из CJS.
import { WebSocketServer } from 'ws';
import { createRequire } from 'module';
import { noteService, noteAccessService, tokenService, redisService } from '../services/index.js';

const require = createRequire(import.meta.url);
const Y = require('yjs');
const { setupWSConnection, getYDoc, docs: yjsDocs } = require('y-websocket/bin/utils');
const syncProtocol = require('y-protocols/sync');
const encoding = require('lib0/encoding');
const decoding = require('lib0/decoding');

const messageSync = 0;
const messageAwareness = 1;
const messageAuth = 2;
const messageServerEpoch = 100; // Custom message type for server epoch

// Уникальная метка времени запуска сервера
// При перезапуске сервера epoch меняется, что сигнализирует клиентам сбросить свои Y.Doc
export const SERVER_EPOCH = Date.now().toString();
console.log(`[YJS] Server epoch: ${SERVER_EPOCH}`);

const docStateMap = new WeakMap();

// =======================
// Presence по заметкам
// =======================
// noteId -> Map<userId, connectionCount>
const presenceByNote = new Map();
// ws -> { noteId, userId }
const connectionPresence = new WeakMap();

// docName -> timeout ID для отложенного уничтожения
const docCleanupTimers = new Map();
const DOC_CLEANUP_DELAY = 5 * 60 * 1000; // 5 минут неактивности

const toUint8Array = (message) => {
    if (message instanceof Uint8Array) return message;
    if (Array.isArray(message)) return Uint8Array.from(message);
    if (message instanceof ArrayBuffer) return new Uint8Array(message);
    if (Buffer.isBuffer(message)) return new Uint8Array(message);
    return null;
};

const shouldBlockUpdateFromReadOnly = (message) => {
    try {
        const uint8Message = toUint8Array(message);
        if (!uint8Message || uint8Message.length === 0) {
            return false;
        }
        const decoder = decoding.createDecoder(uint8Message);
        const messageType = decoding.readVarUint(decoder);

        if (messageType === messageSync) {
            const syncMessageType = decoding.readVarUint(decoder);
            return syncMessageType === syncProtocol.messageYjsUpdate;
        }

        // Разрешаем awareness/messages
        if (messageType === messageAwareness || messageType === messageAuth) {
            return false;
        }

        return false;
    } catch (error) {
        console.error('[YJS] Ошибка разбора сообщения read-only клиента:', error);
        // На всякий случай блокируем, чтобы не допустить изменений
        return true;
    }
};

const getDocState = (docName, doc) => {
    let state = docStateMap.get(doc);
    if (!state) {
        state = {
            isDbStateLoaded: false,
            isUpdateHandlerAttached: false,
            docName,
        };
        docStateMap.set(doc, state);
    }
    return state;
};

export const setupYjs = (server) => {
    const wss = new WebSocketServer({ server });

    const registerPresence = (noteId, userId, ws) => {
        let usersMap = presenceByNote.get(noteId);
        if (!usersMap) {
            usersMap = new Map();
            presenceByNote.set(noteId, usersMap);
        }
        const current = usersMap.get(userId) || 0;
        usersMap.set(userId, current + 1);
        connectionPresence.set(ws, { noteId, userId });
    };

    const unregisterPresence = (ws) => {
        const info = connectionPresence.get(ws);
        if (!info) return;
        const { noteId, userId } = info;
        const usersMap = presenceByNote.get(noteId);
        if (!usersMap) {
            connectionPresence.delete(ws);
            return;
        }
        const current = usersMap.get(userId) || 0;
        if (current <= 1) {
            usersMap.delete(userId);
        } else {
            usersMap.set(userId, current - 1);
        }
        if (usersMap.size === 0) {
            presenceByNote.delete(noteId);
        }
        connectionPresence.delete(ws);
    };

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

            // SECURITY FIX (Bug #23): Токен НЕ принимается из query string
            // Ждём auth сообщение от клиента с токеном
            let authenticated = false;
            let userId = null;
            let permission = null;

            console.log(`[YJS] WebSocket подключение для заметки ${noteId}, ожидание auth...`);

            const authMessageHandler = async (message) => {
                if (authenticated) return;

                try {
                    const messageStr = message.toString();
                    let authData;

                    try {
                        authData = JSON.parse(messageStr);
                    } catch {
                        return;
                    }

                    if (authData.type !== 'auth') {
                        return;
                    }

                    console.log(`[YJS] Получено auth сообщение для ${noteId}`);

                    const token = authData.token;

                    // Гостевой доступ: token=null — проверяем, публична ли заметка
                    if (!token) {
                        const noteData = await noteService.getNoteById(noteId);
                        if (!noteData || !noteData.isPublic) {
                            ws.close(1008, 'Authentication required');
                            return;
                        }
                        userId = `guest-${Date.now()}`;
                        permission = 'read';
                        authenticated = true;
                        console.log(`[YJS] ✓ Guest auth: ${userId}, perm=read (public note)`);
                        ws.off('message', authMessageHandler);
                        initializeYjsConnection();
                        return;
                    }

                    const userData = tokenService.validateAccessToken(token);
                    if (!userData || !userData.id) {
                        ws.close(1008, 'Invalid token');
                        return;
                    }

                    userId = userData.id;

                    permission = await noteAccessService.getUserPermissionForNote(userId, noteId);
                    if (!permission) {
                        ws.close(1008, 'Access denied');
                        return;
                    }

                    authenticated = true;
                    console.log(`[YJS] ✓ Auth: userId=${userId}, perm=${permission}`);

                    ws.off('message', authMessageHandler);

                    initializeYjsConnection();
                } catch (authError) {
                    console.error(`[YJS] Auth error:`, authError);
                    ws.close(1011, 'Auth error');
                }
            };

            const initializeYjsConnection = async () => {
                const isReadOnly = permission !== 'edit';

                const docName = `yjs/${noteId}`;

                // Отменяем таймер уничтожения при новом подключении
                if (docCleanupTimers.has(docName)) {
                    console.log(
                        `[YJS] Отмена таймера уничтожения для ${docName} (новое подключение)`,
                    );
                    clearTimeout(docCleanupTimers.get(docName));
                    docCleanupTimers.delete(docName);
                }

                // Регистрируем presence для этой WS-сессии (не для гостей)
                const isGuest = typeof userId === 'string' && userId.startsWith('guest-');
                if (!isGuest) {
                    registerPresence(noteId, userId, ws);
                }

                // Получаем или создаем документ
                const sharedDoc = getYDoc(docName);
                const docState = getDocState(docName, sharedDoc);

                // Проверяем текущее состояние документа
                const currentContent = sharedDoc.getText('content').toString();
                console.log(
                    `[YJS] Текущее состояние документа ${docName}: ${currentContent.length} символов`,
                );

                // Загружаем состояние из БД, если документ пустой (даже если уже был загружен ранее)
                // Это нужно, т.к. документ может быть уничтожен после отключения всех клиентов
                let stateLoaded = false;
                if (!docState.isDbStateLoaded && currentContent.length === 0) {
                    console.log(`[YJS] Документ ${docName} пустой, загрузка состояния...`);

                    // СНАЧАЛА проверяем Redis кэш (быстро)
                    let savedState = await redisService.getYjsState(noteId);
                    let noteData = null;

                    if (savedState) {
                        console.log(
                            `[YJS] ✓ Состояние найдено в Redis кэше, размер: ${savedState.length} байт`,
                        );
                    } else {
                        // Если нет в кэше, загружаем из MongoDB
                        console.log(`[YJS] Состояние не найдено в Redis, загрузка из MongoDB...`);
                        noteData = await noteService.getNoteById(noteId);

                        if (noteData) {
                            console.log(`[YJS] ✓ Заметка ${noteId} успешно загружена из БД`);
                            console.log(`[YJS] Данные заметки:`, {
                                id: noteData._id || noteData.id,
                                title: noteData.title,
                                hasYdocState: !!noteData.ydocState,
                                ydocStateType: noteData.ydocState
                                    ? noteData.ydocState.constructor.name
                                    : 'null',
                                ydocStateLength: noteData.ydocState ? noteData.ydocState.length : 0,
                            });

                            // Применяем состояние из БД, если оно есть
                            if (noteData.ydocState) {
                                // Убеждаемся, что это Buffer или Uint8Array
                                if (Buffer.isBuffer(noteData.ydocState)) {
                                    savedState = noteData.ydocState;
                                    console.log(
                                        `[YJS] ✓ Найдено сохраненное состояние YJS (Buffer), размер: ${savedState.length} байт`,
                                    );
                                } else if (noteData.ydocState instanceof Uint8Array) {
                                    savedState = noteData.ydocState;
                                    console.log(
                                        `[YJS] ✓ Найдено сохраненное состояние YJS (Uint8Array), размер: ${savedState.length} байт`,
                                    );
                                } else {
                                    console.log(
                                        `[YJS] ⚠ ydocState имеет неожиданный тип: ${noteData.ydocState.constructor.name}`,
                                    );
                                    // Пытаемся преобразовать
                                    try {
                                        savedState = Buffer.from(noteData.ydocState);
                                        console.log(
                                            `[YJS] ✓ Преобразовано в Buffer, размер: ${savedState.length} байт`,
                                        );
                                    } catch (e) {
                                        console.error(
                                            `[YJS] ✗ Ошибка преобразования ydocState:`,
                                            e,
                                        );
                                    }
                                }

                                // Сохраняем в Redis кэш для следующих разов
                                if (savedState) {
                                    await redisService.setYjsState(noteId, savedState);
                                }
                            } else {
                                console.log(
                                    `[YJS] ⚠ Заметка найдена, но нет сохраненного состояния YJS (ydocState = null/undefined)`,
                                );
                            }
                        } else {
                            console.log(`[YJS] ✗ Заметка ${noteId} не найдена в БД`);
                        }
                    }

                    // Применяем состояние к документу (из Redis или MongoDB)
                    // ВАЖНО: используем Y.applyUpdate() для сохранения ID элементов CRDT.
                    // Никогда не извлекаем текст строкой и не вставляем через text.insert() —
                    // это создаёт новые элементы с новыми ID, что ломает CRDT-мерж при реконнекте
                    // и приводит к дупликации контента.
                    if (savedState) {
                        console.log(
                            `[YJS] Применение состояния к документу ${docName} (${savedState.length} байт)...`,
                        );

                        try {
                            // Проверяем savedState через tempDoc, затем применяем
                            // к sharedDoc через re-encode (обходит проблему совместимости
                            // с y-websocket getYDoc)
                            const tempDoc = new Y.Doc();
                            Y.applyUpdate(tempDoc, savedState);
                            const tempContent = tempDoc.getText('content').toString();

                            if (tempContent.length > 0) {
                                // Re-encode и применяем — сохраняет оригинальные CRDT ID
                                const freshUpdate = Y.encodeStateAsUpdate(tempDoc);
                                Y.applyUpdate(sharedDoc, freshUpdate, null);

                                const afterContent = sharedDoc.getText('content').toString();
                                console.log(
                                    `[YJS] ✓ Состояние применено: ${afterContent.length} символов`,
                                );
                                if (afterContent.length > 0) {
                                    stateLoaded = true;
                                }
                            } else {
                                console.log(
                                    `[YJS] ⚠ savedState валиден но текст пустой (${savedState.length} байт)`,
                                );
                            }
                            tempDoc.destroy();
                        } catch (e) {
                            console.error(`[YJS] Ошибка applyUpdate:`, e.message);
                        }

                        // Fallback: если applyUpdate не дал текста, пробуем поле content
                        if (!stateLoaded) {
                            const fallbackContent =
                                noteData && typeof noteData.content === 'string'
                                    ? noteData.content
                                    : '';
                            if (fallbackContent.length > 0) {
                                console.log(
                                    `[YJS] Fallback: используем поле content (${fallbackContent.length} символов)`,
                                );
                                sharedDoc.transact(() => {
                                    const text = sharedDoc.getText('content');
                                    text.delete(0, text.length);
                                    text.insert(0, fallbackContent);
                                }, null);
                                stateLoaded = sharedDoc.getText('content').toString().length > 0;
                            }
                        }
                    }
                    docState.isDbStateLoaded = true;
                } else {
                    console.log(
                        `[YJS] Документ ${docName} уже содержит данные (${currentContent.length} символов), пропуск загрузки из БД`,
                    );
                    stateLoaded = true; // Документ уже содержит данные
                }

                // Ждём, пока состояние загрузится (если нужно)
                if (!stateLoaded && currentContent.length === 0) {
                    // Даём небольшую задержку для применения состояния
                    await new Promise((resolve) => setTimeout(resolve, 50));
                    const finalCheck = sharedDoc.getText('content').toString();
                    if (finalCheck.length > 0) {
                        console.log(
                            `[YJS] Состояние применено после задержки: ${finalCheck.length} символов`,
                        );
                    }
                }

                // КРИТИЧЕСКИ ВАЖНО: Применяем состояние из БД ДО регистрации обработчика update
                // и ДО подключения клиента, чтобы избежать race condition
                const contentBeforeHandler = sharedDoc.getText('content').toString();
                console.log(
                    `[YJS] Состояние документа перед регистрацией обработчика: ${contentBeforeHandler.length} символов`,
                );

                // Настраиваем обработчик сохранения только один раз на живой doc instance
                // НО ТОЛЬКО ПОСЛЕ того, как состояние из БД применено
                if (!docState.isUpdateHandlerAttached) {
                    console.log(`[YJS] Регистрация обработчика update для документа ${docName}`);

                    const SAVE_DEBOUNCE_MS = 2000;
                    const MAX_RETRIES = 3;
                    const SNAPSHOT_QUIET_PERIOD_MS = 10000; // 10 секунд без изменений для создания snapshot

                    // Debounce для сохранения - сохраняем не чаще чем раз в SAVE_DEBOUNCE_MS
                    docState.saveTimeout = null;
                    docState.isSaving = false;
                    docState.retryCount = 0;
                    docState.lastUpdateTime = Date.now(); // Время последнего обновления
                    const debouncedSave = async () => {
                        if (docState.saveTimeout) {
                            clearTimeout(docState.saveTimeout);
                        }
                        docState.saveTimeout = setTimeout(async () => {
                            docState.saveTimeout = null;
                            await saveDocState();
                        }, SAVE_DEBOUNCE_MS);
                    };

                    const saveDocState = async () => {
                        if (docState.isSaving) {
                            console.log(`[YJS] Сохранение уже в процессе, пропускаем`);
                            return;
                        }

                        docState.isSaving = true;

                        try {
                            const currentText = sharedDoc.getText('content').toString();

                            // if (currentText.length === 0) return;

                            const state = Y.encodeStateAsUpdate(sharedDoc);

                            // Проверяем корректность состояния
                            const testDoc = new Y.Doc();
                            Y.applyUpdate(testDoc, state);
                            const testText = testDoc.getText('content').toString();

                            if (testText.length === 0 && currentText.length === 0) {
                                console.log(
                                    `[YJS] Сохранение пустого состояния (пользователь удалил весь текст)`,
                                );
                            }

                            // Проверяем, "тихий" ли документ для безопасного создания snapshot
                            const timeSinceLastUpdate = Date.now() - docState.lastUpdateTime;
                            const isQuietForSnapshot =
                                timeSinceLastUpdate >= SNAPSHOT_QUIET_PERIOD_MS;

                            if (state.length > 500 * 1024) {
                                // > 500KB
                                console.log(
                                    `[YJS] Большой документ (${(state.length / 1024).toFixed(2)} KB), тишина: ${timeSinceLastUpdate}ms / ${SNAPSHOT_QUIET_PERIOD_MS}ms требуется`,
                                );
                            }

                            await noteService.saveYDocState(noteId, state, {
                                allowSnapshot: isQuietForSnapshot,
                            });
                            await redisService.setYjsState(noteId, state);
                            console.log(
                                `[YJS] ✓ Сохранено в БД и Redis для заметки ${noteId}, размер: ${state.length} байт, текст: ${testText.length} символов`,
                            );

                            // Сброс счётчика retry при успехе
                            docState.retryCount = 0;
                        } catch (err) {
                            console.error(
                                `[YJS] Ошибка сохранения (попытка ${docState.retryCount + 1}/${MAX_RETRIES}):`,
                                err.message,
                            );

                            if (docState.retryCount < MAX_RETRIES) {
                                docState.retryCount++;
                                const delay = Math.pow(2, docState.retryCount) * 1000; // 2s, 4s, 8s
                                console.log(`[YJS] Повтор сохранения через ${delay}ms...`);

                                setTimeout(async () => {
                                    docState.isSaving = false;
                                    await saveDocState();
                                }, delay);
                                return;
                            } else {
                                console.error(
                                    `[YJS] КРИТИЧНО: Не удалось сохранить после ${MAX_RETRIES} попыток!`,
                                );
                                // TODO: Сохранить в таблицу failed_saves для восстановления
                            }
                        } finally {
                            // Сбрасываем флаг только если не планируем retry
                            if (docState.retryCount >= MAX_RETRIES || docState.retryCount === 0) {
                                docState.isSaving = false;
                            }
                        }
                    };

                    const updateHandler = async (update, origin) => {
                        // Игнорируем обновления, которые мы сами применили из БД (origin = null)
                        if (origin === null) return;

                        // Обновляем время последнего изменения (для определения "тихого" периода snapshot)
                        docState.lastUpdateTime = Date.now();

                        try {
                            debouncedSave();
                        } catch (err) {
                            console.error(`[YJS] Ошибка в обработчике update:`, err.message);
                        }
                    };

                    // Сохраняем состояние при отключении всех клиентов
                    const checkAndSaveOnDisconnect = async () => {
                        const activeConnections = wss.clients.size;
                        console.log(
                            `[YJS] Проверка подключений для ${docName}: ${activeConnections} активных`,
                        );

                        if (activeConnections <= 1) {
                            console.log(
                                `[YJS] Последнее подключение закрывается, сохраняем состояние немедленно...`,
                            );

                            if (docState.saveTimeout) {
                                clearTimeout(docState.saveTimeout);
                                docState.saveTimeout = null;
                            }

                            await saveDocState();
                        }
                    };

                    // Сохраняем ссылку на функцию для вызова при отключении
                    docState.saveDocState = saveDocState;
                    docState.checkAndSaveOnDisconnect = checkAndSaveOnDisconnect;

                    sharedDoc.on('update', updateHandler);
                    docState.isUpdateHandlerAttached = true;
                    docState.updateHandler = updateHandler;
                    console.log(`[YJS] Обработчик update зарегистрирован для документа ${docName}`);
                } else {
                    console.log(
                        `[YJS] Обработчик update уже зарегистрирован для документа ${docName}`,
                    );
                }

                // КРИТИЧЕСКИ ВАЖНО: Финальная проверка и применение состояния ПЕРЕД подключением клиента
                // setupWSConnection сразу отправляет состояние клиенту, поэтому оно ДОЛЖНО быть применено
                let finalContent = sharedDoc.getText('content').toString();
                console.log(
                    `[YJS] Финальная проверка перед подключением клиента: ${finalContent.length} символов`,
                );

                // Если документ всё ещё пустой, пытаемся загрузить из БД ещё раз
                if (finalContent.length === 0) {
                    console.log(
                        `[YJS] ⚠ Документ пустой перед подключением, повторная загрузка из БД...`,
                    );
                    const noteData = await noteService.getNoteById(noteId);
                    if (noteData?.ydocState) {
                        try {
                            const uint8State =
                                noteData.ydocState instanceof Uint8Array
                                    ? noteData.ydocState
                                    : new Uint8Array(
                                          Buffer.isBuffer(noteData.ydocState)
                                              ? noteData.ydocState
                                              : Buffer.from(noteData.ydocState),
                                      );
                            // Используем tempDoc re-encode (прямой applyUpdate на getYDoc не работает)
                            const retryDoc = new Y.Doc();
                            Y.applyUpdate(retryDoc, uint8State);
                            const retryContent = retryDoc.getText('content').toString();
                            if (retryContent.length > 0) {
                                const retryUpdate = Y.encodeStateAsUpdate(retryDoc);
                                Y.applyUpdate(sharedDoc, retryUpdate, null);
                            }
                            retryDoc.destroy();
                            finalContent = sharedDoc.getText('content').toString();
                            console.log(
                                `[YJS] Повторное применение: ${finalContent.length} символов`,
                            );
                        } catch (e) {
                            console.error(`[YJS] Ошибка повторного применения:`, e.message);
                        }
                    }
                }

                console.log(
                    `[YJS] Подключение клиента к документу ${docName}, текущее содержимое: ${finalContent.length} символов, readOnly=${isReadOnly}`,
                );

                if (isReadOnly) {
                    // Оборачиваем обработчики сообщений, чтобы блокировать попытки записи
                    const originalOn = ws.on.bind(ws);
                    ws.on = (event, listener) => {
                        if (event === 'message') {
                            const wrapped = (message, ...args) => {
                                if (shouldBlockUpdateFromReadOnly(message)) {
                                    console.log(
                                        '[YJS] Блокируем попытку записи от read-only клиента',
                                    );
                                    return;
                                }
                                listener(message, ...args);
                            };
                            return originalOn(event, wrapped);
                        }
                        return originalOn(event, listener);
                    };
                }

                if (finalContent.length > 0) {
                    console.log(
                        `[YJS] Первые 100 символов для отправки клиенту: "${finalContent.substring(0, 100)}"`,
                    );
                }

                console.log(
                    `[YJS] Состояние перед подключением клиента: ${finalContent.length} символов`,
                );

                console.log(`[YJS] Вызов setupWSConnection для документа ${docName}...`);
                console.log(
                    `[YJS] Состояние документа перед setupWSConnection: ${finalContent.length} символов`,
                );
                console.log(
                    `[YJS] Количество активных подключений до: ${sharedDoc.conns?.size || 0}`,
                );

                setupWSConnection(ws, req, { docName });

                // Отправляем server epoch клиенту для определения перезапуска сервера
                // Если epoch изменился, клиент должен сбросить свой Y.Doc
                try {
                    const epochEncoder = encoding.createEncoder();
                    encoding.writeVarUint(epochEncoder, messageServerEpoch);
                    encoding.writeVarString(epochEncoder, SERVER_EPOCH);
                    const epochMessage = encoding.toUint8Array(epochEncoder);
                    ws.send(epochMessage);
                    console.log(`[YJS] Отправлен server epoch клиенту: ${SERVER_EPOCH}`);
                } catch (e) {
                    console.error(`[YJS] Ошибка отправки server epoch:`, e);
                }

                // Дополнительный sync step 2 через задержку — страховка на случай,
                // если нормальный протокол синхронизации не сработал
                setTimeout(() => {
                    const afterSetupContent = sharedDoc.getText('content').toString();
                    if (afterSetupContent.length > 0 && ws.readyState === 1) {
                        try {
                            const encoder = encoding.createEncoder();
                            encoding.writeVarUint(encoder, 0); // messageSync
                            syncProtocol.writeSyncStep2(encoder, sharedDoc);
                            ws.send(encoding.toUint8Array(encoder));
                        } catch {
                            /* ignore */
                        }
                    }
                }, 200);

                console.log(`[YJS] ✓ Клиент подключен к документу ${docName}`);

                // Добавляем обработчик на отключение клиента для сохранения состояния
                ws.on('close', () => {
                    console.log(`[YJS] Клиент отключился от документа ${docName}`);
                    // Обновляем presence по отключению
                    unregisterPresence(ws);
                    const activeConnections = sharedDoc.conns?.size || 0;
                    console.log(`[YJS] Активных подключений осталось: ${activeConnections}`);

                    // Если это было последнее подключение, сохраняем состояние немедленно
                    if (activeConnections === 0) {
                        if (docState.saveDocState) {
                            console.log(
                                `[YJS] Последнее подключение закрыто, сохраняем состояние...`,
                            );
                            // Небольшая задержка, чтобы убедиться, что все обновления применены
                            setTimeout(() => {
                                docState.saveDocState();
                            }, 100);
                        }

                        // Очищаем update handler при отключении последнего клиента
                        // Это предотвращает утечку памяти при накоплении handlers
                        if (docState.updateHandler && docState.isUpdateHandlerAttached) {
                            console.log(
                                `[YJS] Удаление update handler для документа ${docName} (последнее подключение)`,
                            );

                            // Отписываемся от событий update
                            sharedDoc.off('update', docState.updateHandler);
                            docState.isUpdateHandlerAttached = false;
                            docState.updateHandler = null;

                            // Очищаем таймауты
                            if (docState.saveTimeout) {
                                clearTimeout(docState.saveTimeout);
                                docState.saveTimeout = null;
                            }

                            console.log(`[YJS] Update handler удален для документа ${docName}`);
                        }

                        // Запускаем таймер уничтожения Y.Doc после периода неактивности
                        // Это освобождает память для документов, к которым никто не подключается
                        console.log(
                            `[YJS] Запуск таймера уничтожения для ${docName} (${DOC_CLEANUP_DELAY / 1000 / 60} минут)`,
                        );
                        const cleanupTimer = setTimeout(() => {
                            console.log(`[YJS] Таймер сработал: уничтожение Y.Doc для ${docName}`);

                            // Проверяем, что действительно нет активных подключений
                            const finalCheck = sharedDoc.conns?.size || 0;
                            if (finalCheck === 0) {
                                console.log(
                                    `[YJS] Уничтожение Y.Doc для ${docName} (нет подключений ${DOC_CLEANUP_DELAY / 1000 / 60} минут)`,
                                );

                                // Удаляем handler (если ещё не удалён)
                                if (docState.updateHandler) {
                                    sharedDoc.off('update', docState.updateHandler);
                                    docState.updateHandler = null;
                                }

                                // Очищаем все таймауты
                                if (docState.saveTimeout) {
                                    clearTimeout(docState.saveTimeout);
                                    docState.saveTimeout = null;
                                }

                                // ВАЖНО: сначала удаляем из y-websocket docs Map,
                                // затем уничтожаем. Иначе getYDoc вернёт zombie-doc
                                // при следующем подключении (с isDbStateLoaded=true,
                                // но пустым состоянием) и заметка не загрузится.
                                yjsDocs.delete(docName);

                                // Уничтожаем Y.Doc
                                if (typeof sharedDoc.destroy === 'function') {
                                    sharedDoc.destroy();
                                    console.log(`[YJS] Y.Doc уничтожен для ${docName}`);
                                }

                                // Удаляем таймер из Map
                                docCleanupTimers.delete(docName);
                            } else {
                                console.log(
                                    `[YJS] Отмена уничтожения ${docName}: появились новые подключения (${finalCheck})`,
                                );
                                docCleanupTimers.delete(docName);
                            }
                        }, DOC_CLEANUP_DELAY);

                        docCleanupTimers.set(docName, cleanupTimer);
                    } else if (docState.checkAndSaveOnDisconnect) {
                        // Проверяем и сохраняем через debounce
                        docState.checkAndSaveOnDisconnect();
                    }
                });
            };

            // Регистрируем auth handler
            ws.on('message', authMessageHandler);

            // Auth timeout (10 секунд)
            const authTimeout = setTimeout(() => {
                if (!authenticated) {
                    console.warn(`[YJS] Auth timeout для заметки ${noteId}`);
                    ws.close(1008, 'Authentication timeout');
                }
            }, 10000);

            ws.on('close', () => {
                clearTimeout(authTimeout);
            });
        } catch (error) {
            console.error('WebSocket connection error:', error);
            ws.close(1011, 'Internal server error');
        }
    });
};

export const saveAllActiveDocs = async () => {
    // В текущей реализации y-websocket управляет документами самостоятельно.
    // При необходимости можно расширить и сохранять документы по docName.
};

// Возвращает список userId, у которых сейчас есть хотя бы одно активное WS‑подключение к noteId
export const getNotePresence = (noteId) => {
    const usersMap = presenceByNote.get(noteId);
    if (!usersMap) return [];
    return Array.from(usersMap.entries())
        .filter(([, count]) => count > 0)
        .map(([userId]) => userId);
};
