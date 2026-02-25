// Скрипт для применения Bug #23 fix к yjs-server.js
// Заменяет старую логику аутентификации на новую (auth через WebSocket message)

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const serverFile = path.join(__dirname, 'yjs-server.js');
const backupFile = path.join(__dirname, 'yjs-server.js.backup');

console.log('[Auth Fix] Начало применения Bug #23 fix...');

// Создаём резервную копию
const content = fs.readFileSync(serverFile, 'utf8');
fs.writeFileSync(backupFile, content, 'utf8');
console.log(`[Auth Fix] Создана резервная копия: ${backupFile}`);

// Находим начало wss.on("connection")
const connectionStart = content.indexOf('wss.on("connection", async (ws, req) => {');
if (connectionStart === -1) {
    console.error('[Auth Fix] Не найден connection handler!');
    process.exit(1);
}

// Находим конец connection handler (matching closing brace)
let braceCount = 0;
let connectionEnd = -1;
let inString = false;
let stringChar = null;
let escaped = false;

for (let i = connectionStart; i < content.length; i++) {
    const char = content[i];
    const _prevChar = i > 0 ? content[i - 1] : '';

    // Обработка строк
    if (!escaped && (char === '"' || char === "'" || char === '`')) {
        if (!inString) {
            inString = true;
            stringChar = char;
        } else if (char === stringChar) {
            inString = false;
            stringChar = null;
        }
    }

    escaped = char === '\\' && !escaped;

    // Подсчёт скобок (только вне строк)
    if (!inString) {
        if (char === '{') braceCount++;
        if (char === '}') {
            braceCount--;
            if (braceCount === 0) {
                connectionEnd = i + 1;
                break;
            }
        }
    }
}

if (connectionEnd === -1) {
    console.error('[Auth Fix] Не найден конец connection handler!');
    process.exit(1);
}

console.log(`[Auth Fix] Connection handler найден: ${connectionStart} - ${connectionEnd}`);

// Извлекаем код внутри connection handler (после try {)
const tryStart = content.indexOf('try {', connectionStart);
const oldHandlerContent = content.substring(tryStart + 5, connectionEnd - 2); // -2 для } и }

// Новая логика connection handler
const newHandler = `try {
      const url = new URL(req.url, "http://localhost");
      const pathname = url.pathname || "/";
      if (!pathname.startsWith("/yjs")) {
        ws.close(1008, "Invalid path");
        return;
      }

      const noteId = url.searchParams.get("noteId");

      if (!noteId) {
        ws.close(1008, "NoteId is required");
        return;
      }

      // SECURITY FIX (Bug #23): Токен больше НЕ принимается из query string
      // Вместо этого ждём auth сообщение от клиента
      let authenticated = false;
      let userId = null;
      let permission = null;

      console.log(\`[YJS] WebSocket подключение для заметки \${noteId}, ожидание auth сообщения...\`);

      // Обработчик auth сообщения
      const authMessageHandler = async (message) => {
        if (authenticated) return;

        try {
          const messageStr = message.toString();
          let authData;

          try {
            authData = JSON.parse(messageStr);
          } catch (e) {
            return;
          }

          if (authData.type !== 'auth') {
            return;
          }

          console.log(\`[YJS] Получено auth сообщение для заметки \${noteId}\`);

          const token = authData.token;
          if (!token) {
            ws.close(1008, "Token is required");
            return;
          }

          const userData = tokenService.validateAccessToken(token);
          if (!userData || !userData.id) {
            ws.close(1008, "Invalid token");
            return;
          }

          userId = userData.id;

          permission = await noteAccessService.getUserPermissionForNote(userId, noteId);
          if (!permission) {
            ws.close(1008, "Access denied");
            return;
          }

          authenticated = true;
          console.log(\`[YJS] ✓ Auth успешна: userId=\${userId}, permission=\${permission}\`);

          ws.off('message', authMessageHandler);

          // Теперь инициализируем Yjs
          await initializeYjsConnection();

        } catch (authError) {
          console.error(\`[YJS] Auth error:\`, authError);
          if (!authenticated) {
            ws.close(1011, "Authentication error");
          }
        }
      };

      // Инициализация Yjs после auth
      const initializeYjsConnection = async () => {`;

// Находим первую проверку токена в старом коде
const _tokenCheckStart = oldHandlerContent.indexOf('const token = url.searchParams.get("token");');
const permissionCheckEnd = oldHandlerContent.indexOf('const isReadOnly = permission !== "edit";');

// Берём код ПОСЛЕ проверки permission (это вся логика инициализации Yjs)
const yjsLogicStart = permissionCheckEnd;
const yjsLogic = oldHandlerContent.substring(yjsLogicStart);

// Добавляем отступ для yjsLogic (он будет внутри initializeYjsConnection)
const indentedYjsLogic = yjsLogic
    .split('\n')
    .map((line) => '        ' + line)
    .join('\n');

// Закрываем initializeYjsConnection
const closeInitialize = `
      };

      // Регистрируем auth handler
      ws.on('message', authMessageHandler);

      // Auth timeout (10 секунд)
      const authTimeout = setTimeout(() => {
        if (!authenticated) {
          console.warn(\`[YJS] Auth timeout для заметки \${noteId}\`);
          ws.close(1008, "Authentication timeout");
        }
      }, 10000);

      ws.on('close', () => {
        clearTimeout(authTimeout);
      });

    } catch (error) {
      console.error("WebSocket connection error:", error);
      ws.close(1011, "Internal server error");
    }`;

// Собираем новый connection handler
const newConnectionHandler = newHandler + indentedYjsLogic + closeInitialize;

// Заменяем в файле
const before = content.substring(0, tryStart);
const after = content.substring(connectionEnd);
const newContent = before + newConnectionHandler + after;

// Сохраняем
fs.writeFileSync(serverFile, newContent, 'utf8');

console.log('[Auth Fix] ✓ Изменения успешно применены!');
console.log('[Auth Fix] Резервная копия сохранена в:', backupFile);
console.log('[Auth Fix] Для отката используйте: cp yjs-server.js.backup yjs-server.js');
