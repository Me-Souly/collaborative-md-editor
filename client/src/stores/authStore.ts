import { makeAutoObservable, runInAction } from 'mobx';
import { IUser } from '@models/IUser';
import AuthService from '@service/AuthService';
import PasswordService from '@service/PasswordService';
import axios from 'axios';
import { AuthResponse } from '@models/response/AuthResponse';
import { API_URL } from '@http';
import { setToken, removeToken } from '@utils/tokenStorage';
import { getCsrfToken, clearCsrfToken, fetchCsrfToken } from '@utils/csrfToken';

export default class authStore {
    user = {} as IUser;
    isAuth = false;
    isLoading = false;
    isOfflineMode = false;

    constructor() {
        makeAutoObservable(this);
    }

    setAuth(bool: boolean) {
        this.isAuth = bool;
    }

    setUser(user: IUser) {
        this.user = user;
    }

    setLoading(bool: boolean) {
        this.isLoading = bool;
    }

    setOfflineMode(value: boolean) {
        this.isOfflineMode = value;
    }

    async login(identifier: string, password: string, rememberMe: boolean = false) {
        try {
            const response = await AuthService.login(identifier, password);
            console.log(response);
            setToken(response.data.accessToken, rememberMe);
            // Обновления observable состояния обернуты в runInAction
            runInAction(() => {
                this.setAuth(true);
                this.setUser(response.data.user);
            });
            // Кэшируем данные пользователя для оффлайн-режима
            try {
                localStorage.setItem('offlineUser', JSON.stringify(response.data.user));
            } catch {
                /* ignore */
            }
        } catch (e) {
            // Пробрасываем ошибку дальше, чтобы компонент мог её обработать
            if (axios.isAxiosError(e)) {
                console.log(e.response?.data?.message);
                throw e; // Пробрасываем ошибку
            } else {
                console.log(e);
                throw e; // Пробрасываем ошибку
            }
        }
    }

    async registration(
        email: string,
        username: string,
        password: string,
        rememberMe: boolean = false,
    ) {
        try {
            const response = await AuthService.registration(email, username, password);
            console.log(response);
            setToken(response.data.accessToken, rememberMe);
            // Обновления observable состояния обернуты в runInAction
            runInAction(() => {
                this.setAuth(true);
                this.setUser(response.data.user);
            });
            // Кэшируем данные пользователя для оффлайн-режима
            try {
                localStorage.setItem('offlineUser', JSON.stringify(response.data.user));
            } catch {
                /* ignore */
            }
        } catch (e) {
            // Пробрасываем ошибку дальше, чтобы компонент мог её обработать
            console.log(e);
            if (axios.isAxiosError(e)) {
                console.log(e.response?.data?.message);
                throw e; // Пробрасываем ошибку
            } else {
                console.log(e);
                throw e; // Пробрасываем ошибку
            }
        }
    }

    async logout() {
        try {
            const response = await AuthService.logout();
            console.log(response);
            removeToken();
            clearCsrfToken(); // Clear CSRF token on logout
            localStorage.removeItem('offlineUser');
            // Обновления observable состояния обернуты в runInAction
            runInAction(() => {
                this.setAuth(false);
                this.setUser({} as IUser);
            });
            // Fetch new CSRF token for the next login
            await fetchCsrfToken(API_URL);
        } catch (e) {
            if (axios.isAxiosError(e)) console.log(e.response?.data?.message);
            else console.log(e);
        }
    }

    async checkAuth() {
        this.setLoading(true);
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
            // Обновления observable состояния обернуты в runInAction
            runInAction(() => {
                this.setAuth(true);
                this.setUser(response.data.user);
            });
            // Кэшируем данные пользователя для оффлайн-режима
            try {
                localStorage.setItem('offlineUser', JSON.stringify(response.data.user));
            } catch {
                /* ignore */
            }
        } catch (e) {
            if (axios.isAxiosError(e)) {
                console.log(e.response?.data?.message);
                if (e.response) {
                    // Сервер ответил ошибкой (401/403) — сессия недействительна,
                    // сбрасываем авторизацию и очищаем оффлайн-кэш
                    runInAction(() => {
                        this.setAuth(false);
                        this.setUser({} as IUser);
                    });
                    localStorage.removeItem('offlineUser');
                }
                // Нет response → сетевая ошибка → сохраняем текущее состояние (оффлайн-режим)
            } else {
                console.log(e);
            }
        } finally {
            // Обновления observable состояния обернуты в runInAction
            runInAction(() => {
                this.setLoading(false);
            });
        }
    }

    async requestReset(email: string) {
        try {
            const response = await PasswordService.requestReset(email);
            if (response.data.success === true) console.log(response.data);
        } catch (e) {
            if (axios.isAxiosError(e)) console.log(e.response?.data?.message);
            else console.log(e);
        }
    }

    async changePassword(oldPassword: string, newPassword: string) {
        await PasswordService.changePassword(oldPassword, newPassword);
    }
}
