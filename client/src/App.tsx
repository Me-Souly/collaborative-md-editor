import React, { useEffect, useRef } from 'react';
import { BrowserRouter, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { Auth } from '@components/auth/Auth';
import { useAuthStore } from '@hooks/useStores';
import { observer } from 'mobx-react-lite';
import { NoteEditorPage } from '@pages/NoteEditorPage';
import { LandingPage } from '@pages/LandingPage';
import { ProfilePage } from '@pages/ProfilePage';
import { PublicProfilePage } from '@pages/PublicProfilePage';
import { ResetPasswordPage } from '@pages/ResetPasswordPage';
import { ActivationPage } from '@pages/ActivationPage';
import { ModeratorDashboard } from '@pages/ModeratorDashboard';
import { ToastProvider } from '@contexts/ToastContext';
import { Loader } from '@components/common/ui';
import { getToken } from '@utils/tokenStorage';
import { fetchCsrfToken } from '@utils/csrfToken';
import { API_URL, setHttpOfflineMode } from '@http';

// Компонент для защиты роутов
const ProtectedRoute: React.FC<{ children: React.ReactElement }> = observer(({ children }) => {
    const authStore = useAuthStore();

    // Редиректим на форму логина, если пользователь не авторизован
    // (инициализация уже завершена на уровне App)
    if (!authStore.isAuth) {
        return <Navigate to="/" replace />;
    }

    return children;
});

// Компонент для сохранения текущего роута (без восстановления при перезагрузке)
const RoutePreserver = observer(() => {
    const location = useLocation();
    const isInitialMount = useRef(true);

    // Сохраняем текущий роут при каждом изменении (кроме первой загрузки)
    useEffect(() => {
        if (isInitialMount.current) {
            isInitialMount.current = false;
            return;
        }

        // Если переходим на главную страницу, очищаем сохраненный роут
        if (location.pathname === '/') {
            sessionStorage.removeItem('lastRoute');
            return;
        }

        // Не сохраняем роуты авторизации и активации
        if (
            !location.pathname.startsWith('/password/reset') &&
            !location.pathname.startsWith('/activate') &&
            !location.pathname.startsWith('/login')
        ) {
            sessionStorage.setItem('lastRoute', location.pathname + location.search);
        }
    }, [location]);

    return null;
});

function App() {
    const authStore = useAuthStore();
    const [isInitialized, setIsInitialized] = React.useState(false);

    useEffect(() => {
        const initialize = async () => {
            const token = getToken();
            let serverReachable = false;

            // Пытаемся получить CSRF и проверить сессию, но с таймаутом
            // чтобы приложение не зависало при недоступном сервере
            const serverInit = async () => {
                const csrf = await fetchCsrfToken(API_URL);
                // fetchCsrfToken глотает ошибки и возвращает null при сетевой ошибке.
                // Ненулевой результат = сервер точно ответил.
                serverReachable = csrf !== null;
                if (serverReachable && token) {
                    await authStore.checkAuth();
                }
            };

            const timeout = new Promise<void>((resolve) => setTimeout(resolve, 4000));
            await Promise.race([serverInit(), timeout]);

            // Оффлайн-режим: кэш используем ТОЛЬКО если сервер недоступен.
            // Если сервер доступен, но сессия недействительна — показываем лендинг/логин.
            // (Закрытие вкладки без "запомнить меня" → sessionStorage сброшен,
            //  cookie тоже истекло → сервер вернёт 401 → пользователь не авторизован.)
            if (!serverReachable) {
                authStore.setOfflineMode(true);
                setHttpOfflineMode(true);
            }

            if (!authStore.isAuth && !serverReachable) {
                try {
                    const cached = localStorage.getItem('offlineUser');
                    if (cached) {
                        const user = JSON.parse(cached);
                        if (user?.id) {
                            authStore.setAuth(true);
                            authStore.setUser(user);
                        }
                    }
                } catch {
                    /* повреждённый кэш — оставляем неавторизованным */
                }
            }

            setIsInitialized(true);
        };

        initialize();
    }, [authStore]);

    // При восстановлении соединения перепроверяем сессию на сервере.
    // Если пользователь был авторизован через оффлайн-кэш, а refresh-токен
    // оказался недействительным — checkAuth сбросит isAuth и очистит кэш.
    useEffect(() => {
        const handleOnline = () => {
            authStore.setOfflineMode(false);
            setHttpOfflineMode(false);
            if (authStore.isAuth) {
                authStore.checkAuth();
            }
        };
        window.addEventListener('online', handleOnline);
        return () => window.removeEventListener('online', handleOnline);
    }, [authStore]);

    // Показываем загрузку, пока идет инициализация
    if (!isInitialized) {
        return <Loader fullScreen variant="spinner" size="lg" text="Загрузка..." />;
    }

    return (
        <ToastProvider>
            <BrowserRouter>
                <RoutePreserver />
                <Routes>
                    {/* Публичные роуты (доступны без авторизации) */}
                    <Route path="/password/reset/:token" element={<ResetPasswordPage />} />
                    <Route path="/activate/:token" element={<ActivationPage />} />

                    {/* Главная: лендинг для гостей, редактор для авторизованных */}
                    <Route
                        path="/"
                        element={authStore.isAuth ? <NoteEditorPage /> : <LandingPage />}
                    />

                    {/* Логин/регистрация */}
                    <Route
                        path="/login"
                        element={authStore.isAuth ? <Navigate to="/" replace /> : <Auth />}
                    />

                    {/* Просмотр заметки: доступ для всех, гости видят публичные read-only */}
                    <Route path="/note/:noteId" element={<NoteEditorPage />} />
                    <Route
                        path="/profile"
                        element={
                            <ProtectedRoute>
                                <ProfilePage />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/user/:userId"
                        element={
                            <ProtectedRoute>
                                <PublicProfilePage />
                            </ProtectedRoute>
                        }
                    />
                    {/* Роут для модераторов */}
                    {authStore.isAuth && authStore.user.role === 'moderator' && (
                        <Route
                            path="/moderator"
                            element={
                                <ProtectedRoute>
                                    <ModeratorDashboard />
                                </ProtectedRoute>
                            }
                        />
                    )}

                    {/* Catch-all роут */}
                    <Route
                        path="*"
                        element={
                            authStore.isAuth ? (
                                <Navigate to="/" replace />
                            ) : (
                                <Navigate to="/" replace />
                            )
                        }
                    />
                </Routes>
            </BrowserRouter>
        </ToastProvider>
    );
}

export default observer(App);
