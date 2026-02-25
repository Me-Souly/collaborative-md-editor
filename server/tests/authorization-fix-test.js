/**
 * Тест для проверки исправлений Authorization Bypass (bugs #1-3)
 *
 * Чтобы запустить:
 * 1. Убедитесь, что сервер запущен (npm run dev)
 * 2. node tests/authorization-fix-test.js
 */

import axios from 'axios';

const API_URL = 'http://localhost:5000/api';

// Цвета для консоли
const colors = {
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    reset: '\x1b[0m',
};

const log = {
    success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
    error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
    info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
    warn: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
};

let userAToken, userBToken;
let noteId, publicNoteId, folderId;

async function register(username, email, password) {
    try {
        const response = await axios.post(`${API_URL}/registration`, {
            login: username,
            email,
            password,
            name: username,
        });
        return response.data;
    } catch (error) {
        throw new Error(`Registration failed: ${error.response?.data?.message || error.message}`, {
            cause: error,
        });
    }
}

async function login(loginOrEmail, password) {
    try {
        const response = await axios.post(`${API_URL}/login`, {
            loginOrEmail,
            password,
            rememberMe: true,
        });
        return response.data.accessToken;
    } catch (error) {
        throw new Error(`Login failed: ${error.response?.data?.message || error.message}`, {
            cause: error,
        });
    }
}

async function createNote(token, title, isPublic = false, folderId = null) {
    try {
        const response = await axios.post(
            `${API_URL}/notes`,
            { title, isPublic, folderId },
            { headers: { Authorization: `Bearer ${token}` } },
        );
        return response.data.id;
    } catch (error) {
        throw new Error(`Create note failed: ${error.response?.data?.message || error.message}`, {
            cause: error,
        });
    }
}

async function createFolder(token, title) {
    try {
        const response = await axios.post(
            `${API_URL}/folders`,
            { title },
            { headers: { Authorization: `Bearer ${token}` } },
        );
        return response.data.id;
    } catch (error) {
        throw new Error(`Create folder failed: ${error.response?.data?.message || error.message}`, {
            cause: error,
        });
    }
}

async function deleteNote(token, noteId) {
    try {
        await axios.delete(`${API_URL}/notes/${noteId}`, {
            headers: { Authorization: `Bearer ${token}` },
        });
    } catch (error) {
        throw new Error(`Delete note failed: ${error.response?.data?.message || error.message}`, {
            cause: error,
        });
    }
}

async function getNote(token, noteId) {
    try {
        const response = await axios.get(`${API_URL}/notes/${noteId}`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        return response.data;
    } catch (error) {
        if (error.response?.status === 403) {
            return { error: 'Access denied', status: 403 };
        }
        throw error;
    }
}

async function getNotesInFolder(token, folderId) {
    const response = await axios.get(`${API_URL}/folders/${folderId}/notes`, {
        headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
}

async function getPublicNotes(token = null) {
    const config = token ? { headers: { Authorization: `Bearer ${token}` } } : {};
    const response = await axios.get(`${API_URL}/notes/public`, config);
    return response.data;
}

async function runTests() {
    console.log('\n' + '='.repeat(60));
    console.log('🧪 Тестирование исправлений Authorization Bypass');
    console.log('='.repeat(60) + '\n');

    try {
        // Создаём тестовых пользователей
        log.info('Создание тестовых пользователей...');

        await register('testUserA', 'userA@test.com', 'password123');
        userAToken = await login('testUserA', 'password123');
        log.success('User A создан и авторизован');

        await register('testUserB', 'userB@test.com', 'password123');
        userBToken = await login('testUserB', 'password123');
        log.success('User B создан и авторизован');

        console.log('\n' + '-'.repeat(60));
        console.log('TEST 1: Authorization Bypass in getById()');
        console.log('-'.repeat(60) + '\n');

        // User A создаёт приватную заметку
        noteId = await createNote(userAToken, 'Private Note A', false);
        log.info(`User A создал приватную заметку: ${noteId}`);

        // User A может читать свою заметку
        const noteByOwner = await getNote(userAToken, noteId);
        if (!noteByOwner.error) {
            log.success('User A может читать свою заметку');
        } else {
            log.error('User A НЕ может читать свою заметку (БАГ!)');
        }

        // User B НЕ должен получить доступ
        const noteByStranger = await getNote(userBToken, noteId);
        if (noteByStranger.status === 403 || noteByStranger.error === 'Access denied') {
            log.success('✅ FIX РАБОТАЕТ: User B получил "Access denied"');
        } else {
            log.error('❌ БАГ НЕ ИСПРАВЛЕН: User B получил доступ к чужой заметке!');
            console.log('Данные:', noteByStranger);
        }

        console.log('\n' + '-'.repeat(60));
        console.log('TEST 2: Authorization Bypass in getNotesInFolder()');
        console.log('-'.repeat(60) + '\n');

        // User A создаёт папку и заметку в ней
        folderId = await createFolder(userAToken, 'Private Folder A');
        log.info(`User A создал папку: ${folderId}`);

        const noteInFolder = await createNote(
            userAToken,
            'Note in Private Folder',
            false,
            folderId,
        );
        log.info(`User A создал заметку в папке: ${noteInFolder}`);

        // User A видит свою заметку в папке
        const folderNotesA = await getNotesInFolder(userAToken, folderId);
        if (folderNotesA.length > 0) {
            log.success(`User A видит ${folderNotesA.length} заметок в своей папке`);
        } else {
            log.error('User A НЕ видит заметки в своей папке (БАГ!)');
        }

        // User B НЕ должен видеть заметки в чужой папке
        const folderNotesB = await getNotesInFolder(userBToken, folderId);
        if (folderNotesB.length === 0) {
            log.success('✅ FIX РАБОТАЕТ: User B не видит заметки в чужой папке');
        } else {
            log.error(
                `❌ БАГ НЕ ИСПРАВЛЕН: User B видит ${folderNotesB.length} заметок в чужой папке!`,
            );
        }

        console.log('\n' + '-'.repeat(60));
        console.log('TEST 3: Soft Delete Bypass in getAllPublicNotes()');
        console.log('-'.repeat(60) + '\n');

        // User A создаёт публичную заметку
        publicNoteId = await createNote(userAToken, 'Public Note to Delete', true);
        log.info(`User A создал публичную заметку: ${publicNoteId}`);

        // Проверяем, что заметка видна в публичных
        let publicNotes = await getPublicNotes();
        const beforeDelete = publicNotes.find((n) => n.id === publicNoteId);
        if (beforeDelete) {
            log.success('Публичная заметка видна в списке публичных');
        } else {
            log.error('Публичная заметка НЕ видна в списке (БАГ?)');
        }

        // User A удаляет публичную заметку (soft delete)
        await deleteNote(userAToken, publicNoteId);
        log.info('User A удалил публичную заметку (soft delete)');

        // Проверяем, что удалённая заметка НЕ видна в публичных
        publicNotes = await getPublicNotes();
        const afterDelete = publicNotes.find((n) => n.id === publicNoteId);
        if (!afterDelete) {
            log.success('✅ FIX РАБОТАЕТ: Удалённая заметка не видна в публичных');
        } else {
            log.error('❌ БАГ НЕ ИСПРАВЛЕН: Удалённая заметка всё ещё видна в публичных!');
        }

        console.log('\n' + '='.repeat(60));
        log.success('Все тесты завершены!');
        console.log('='.repeat(60) + '\n');
    } catch (error) {
        log.error(`Ошибка теста: ${error.message}`);
        console.error(error);
        process.exit(1);
    }
}

runTests();
