/**
 * Утилита для работы с токеном авторизации
 * Поддерживает два режима хранения:
 * - localStorage (для "Запомнить меня")
 * - sessionStorage (для обычной сессии)
 */

const TOKEN_KEY = 'token';
const REMEMBER_ME_KEY = 'rememberMe';

/**
 * Получает токен из хранилища
 * Проверяет сначала localStorage, потом sessionStorage
 */
export const getToken = (): string | null => {
  // Сначала проверяем localStorage (если была галочка "Запомнить меня")
  const localStorageToken = localStorage.getItem(TOKEN_KEY);
  if (localStorageToken) {
    return localStorageToken;
  }
  
  // Если нет в localStorage, проверяем sessionStorage
  return sessionStorage.getItem(TOKEN_KEY);
};

/**
 * Сохраняет токен в хранилище
 * @param token - токен для сохранения
 * @param rememberMe - если true, сохраняет в localStorage, иначе в sessionStorage
 */
export const setToken = (token: string, rememberMe: boolean = false): void => {
  if (rememberMe) {
    // Сохраняем в localStorage для постоянного хранения
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(REMEMBER_ME_KEY, 'true');
    // Удаляем из sessionStorage, если был там
    sessionStorage.removeItem(TOKEN_KEY);
  } else {
    // Сохраняем в sessionStorage (очистится при закрытии браузера)
    sessionStorage.setItem(TOKEN_KEY, token);
    // Удаляем из localStorage, если был там
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REMEMBER_ME_KEY);
  }
};

/**
 * Удаляет токен из всех хранилищ
 */
export const removeToken = (): void => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REMEMBER_ME_KEY);
  sessionStorage.removeItem(TOKEN_KEY);
};

/**
 * Проверяет, включен ли режим "Запомнить меня"
 */
export const isRememberMe = (): boolean => {
  return localStorage.getItem(REMEMBER_ME_KEY) === 'true';
};

