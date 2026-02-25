import axios from 'axios';
import { AuthResponse } from '@models/response/AuthResponse';
import { toastManager } from '@utils/toastManager';
import { getToken, setToken } from '@utils/tokenStorage';
import { getCsrfToken, fetchCsrfToken, requiresCsrfProtection } from '@utils/csrfToken';

const resolveApiUrl = () => {
    if (process.env.REACT_APP_API_URL) return process.env.REACT_APP_API_URL;
    if (typeof window !== 'undefined' && window.location) {
        const proto = window.location.protocol;
        const host = window.location.hostname;
        const port = process.env.REACT_APP_API_PORT || '5000';
        return `${proto}//${host}:${port}/api`;
    }
    return 'http://localhost:5000/api';
};

export const API_URL = resolveApiUrl();

const $api = axios.create({
    withCredentials: true, // чтобы к каждому запросу куки цеплялись автоматически
    baseURL: API_URL,
});

// Флаг оффлайн-режима — выставляется из App.tsx когда сервер недоступен при старте.
// Подавляет тост "ошибка сети" для всех фоновых запросов во время оффлайн-сессии.
let _offlineMode = false;
export const setHttpOfflineMode = (value: boolean) => {
    _offlineMode = value;
};

$api.interceptors.request.use(async (config) => {
    // Add JWT access token
    const token = getToken();
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }

    // Add CSRF token for state-changing requests
    const method = config.method || 'GET';
    if (requiresCsrfProtection(method)) {
        let csrfToken = getCsrfToken();

        // Если токен отсутствует, попробуем загрузить его
        if (!csrfToken) {
            console.log('[HTTP] CSRF token missing, fetching...');
            csrfToken = await fetchCsrfToken(API_URL);
        }

        if (csrfToken) {
            config.headers['x-csrf-token'] = csrfToken;
        } else {
            console.warn('[HTTP] CSRF token still missing after fetch attempt');
        }
    }

    return config;
});

$api.interceptors.response.use(
    (config) => {
        // Первый успешный ответ сигнализирует, что сервер снова доступен
        if (_offlineMode) _offlineMode = false;
        return config;
    },
    async (error) => {
        const originalRequest = error.config;

        // Handle 401 errors (unauthorized)
        if (error.response?.status === 401 && error.config && !error.config._isRetry) {
            originalRequest._isRetry = true;
            try {
                // Include CSRF token in refresh request
                const csrfToken = getCsrfToken();
                const headers: Record<string, string> = {};
                if (csrfToken) {
                    headers['x-csrf-token'] = csrfToken;
                }

                const response = await axios.post<AuthResponse>(
                    `${API_URL}/refresh`,
                    {},
                    {
                        withCredentials: true,
                        headers,
                    },
                );
                // При обновлении токена сохраняем в то же хранилище, что и было
                const rememberMe = localStorage.getItem('rememberMe') === 'true';
                setToken(response.data.accessToken, rememberMe);
                return $api.request(originalRequest);
            } catch {
                console.log('Not authorized, refresh token failed');
                throw error;
            }
        }

        // Show error toast for server errors (except 401 which is handled above)
        // Only show toast if the request doesn't have skipErrorToast flag
        // This allows components to handle errors themselves if needed
        if (!error.config?.skipErrorToast) {
            if (
                error.response?.status &&
                error.response.status >= 400 &&
                error.response.status !== 401
            ) {
                // Try multiple possible error message fields
                const errorMessage =
                    error.response?.data?.message ||
                    error.response?.data?.error ||
                    error.response?.data?.errorMessage ||
                    error.message ||
                    'Произошла ошибка';
                console.log('Showing error toast:', errorMessage, 'Status:', error.response.status);
                toastManager.error(errorMessage);
            } else if (!error.response) {
                // Network error — подавляем тост в оффлайн-режиме (флаг выставляется из App.tsx),
                // иначе при старте без сервера каждый фоновый запрос спамит уведомлениями
                if (!_offlineMode) {
                    console.log('Network error, showing toast');
                    toastManager.error('Ошибка сети. Проверьте подключение к интернету.');
                }
            }
        } else {
            console.log('Skipping error toast (skipErrorToast flag set)');
        }

        throw error;
    },
);

export default $api;
