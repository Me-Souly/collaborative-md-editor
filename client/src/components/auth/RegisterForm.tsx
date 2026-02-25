import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@hooks/useStores';
import { useToastContext } from '@contexts/ToastContext';
import { observer } from 'mobx-react-lite';
import { Button, Input, PasswordInput, FormField, UserPlusIcon } from '@components/common/ui';
import * as styles from '@components/auth/Auth.module.css';

interface RegisterFormProps {
    onSwitchToLogin: () => void;
}

export const RegisterForm: React.FC<RegisterFormProps> = observer(({ onSwitchToLogin }) => {
    const authStore = useAuthStore();
    const toast = useToastContext();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        username: '',
        email: '',
        password: '',
        confirmPassword: '',
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (
            !formData.username ||
            !formData.email ||
            !formData.password ||
            !formData.confirmPassword
        ) {
            toast.warning('Заполните все поля');
            return;
        }

        if (formData.password !== formData.confirmPassword) {
            toast.error('Пароли не совпадают');
            return;
        }

        if (formData.password.length < 3) {
            toast.error('Пароль должен содержать минимум 3 символа');
            return;
        }

        setLoading(true);
        try {
            await authStore.registration(formData.email, formData.username, formData.password);
            // Проверяем, что регистрация действительно прошла успешно
            if (authStore.isAuth) {
                toast.success('Регистрация выполнена успешно');
                // Восстанавливаем сохраненный роут или переходим на главную
                const lastRoute = sessionStorage.getItem('lastRoute');
                if (
                    lastRoute &&
                    lastRoute !== '/' &&
                    !lastRoute.startsWith('/password/reset') &&
                    !lastRoute.startsWith('/activate')
                ) {
                    navigate(lastRoute, { replace: true });
                    sessionStorage.removeItem('lastRoute');
                } else {
                    navigate('/', { replace: true });
                }
            } else {
                // Если isAuth не стал true, значит была ошибка
                toast.error('Ошибка регистрации');
            }
        } catch (error: any) {
            // Показываем ошибку (skipErrorToast установлен в AuthService, поэтому interceptor не покажет)
            const errorMessage = error?.response?.data?.message || 'Ошибка регистрации';
            toast.error(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData((prev) => ({ ...prev, [field]: e.target.value }));
    };

    return (
        <div className={styles.card}>
            <div className={styles.cardHeader}>
                <div className={styles.iconWrapper}>
                    <UserPlusIcon className={styles.icon} />
                </div>
                <h1 className={styles.title}>Регистрация</h1>
                <p className={styles.description}>Создайте свой аккаунт</p>
            </div>

            <form onSubmit={handleSubmit}>
                <div className={styles.cardContent}>
                    <FormField label="Имя пользователя" htmlFor="username" required>
                        <Input
                            id="username"
                            type="text"
                            placeholder="username"
                            value={formData.username}
                            onChange={handleChange('username')}
                            required
                            disabled={loading}
                            tabIndex={1}
                        />
                    </FormField>

                    <FormField label="Электронная почта" htmlFor="email" required>
                        <Input
                            id="email"
                            type="email"
                            placeholder="example@email.com"
                            value={formData.email}
                            onChange={handleChange('email')}
                            required
                            disabled={loading}
                            tabIndex={2}
                        />
                    </FormField>

                    <FormField label="Пароль" htmlFor="password" required>
                        <PasswordInput
                            id="password"
                            placeholder="••••••••"
                            value={formData.password}
                            onChange={handleChange('password')}
                            required
                            disabled={loading}
                            tabIndex={3}
                        />
                    </FormField>

                    <FormField label="Подтверждение пароля" htmlFor="confirmPassword" required>
                        <PasswordInput
                            id="confirmPassword"
                            placeholder="••••••••"
                            value={formData.confirmPassword}
                            onChange={handleChange('confirmPassword')}
                            required
                            disabled={loading}
                            tabIndex={4}
                        />
                    </FormField>
                </div>

                <div className={styles.cardFooter}>
                    <Button
                        type="submit"
                        variant="primary"
                        fullWidth
                        loading={loading}
                        disabled={loading}
                        tabIndex={5}
                    >
                        {loading ? 'Регистрация...' : 'Зарегистрироваться'}
                    </Button>

                    <p className={styles.switchText}>
                        Уже есть аккаунт?{' '}
                        <button
                            type="button"
                            onClick={onSwitchToLogin}
                            className={styles.switchLink}
                            disabled={loading}
                        >
                            Войти
                        </button>
                    </p>
                </div>
            </form>
        </div>
    );
});
