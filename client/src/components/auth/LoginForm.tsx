import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@hooks/useStores';
import { useToastContext } from '@contexts/ToastContext';
import { observer } from 'mobx-react-lite';
import { ForgotPasswordModal } from '@components/auth/ForgotPasswordModal';
import {
    Button,
    Input,
    PasswordInput,
    Checkbox,
    FormField,
    LogInIcon,
} from '@components/common/ui';
import { isRememberMe } from '@utils/tokenStorage';
import * as styles from '@components/auth/Auth.module.css';

interface LoginFormProps {
    onSwitchToRegister: () => void;
    onForgotPassword: () => void;
}

export const LoginForm: React.FC<LoginFormProps> = observer(
    ({ onSwitchToRegister, onForgotPassword: _onForgotPassword }) => {
        const authStore = useAuthStore();
        const toast = useToastContext();
        const navigate = useNavigate();
        const [rememberMe, setRememberMe] = useState(() => isRememberMe());
        const [loading, setLoading] = useState(false);
        const [showForgotPasswordModal, setShowForgotPasswordModal] = useState(false);
        const [formData, setFormData] = useState({
            emailOrUsername: '',
            password: '',
        });

        const handleSubmit = async (e: React.FormEvent) => {
            e.preventDefault();

            if (!formData.emailOrUsername || !formData.password) {
                toast.warning('Заполните все поля');
                return;
            }

            setLoading(true);
            try {
                await authStore.login(formData.emailOrUsername, formData.password, rememberMe);
                // Проверяем, что авторизация действительно прошла успешно
                if (authStore.isAuth) {
                    toast.success('Вход выполнен успешно');
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
                    toast.error('Неверный email/username или пароль');
                }
            } catch (error: any) {
                // Показываем ошибку (skipErrorToast установлен в AuthService, поэтому interceptor не покажет)
                const errorMessage =
                    error?.response?.data?.message || 'Неверный email/username или пароль';
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
                        <LogInIcon className={styles.icon} />
                    </div>
                    <h1 className={styles.title}>Вход</h1>
                    <p className={styles.description}>Войдите в свой аккаунт</p>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className={styles.cardContent}>
                        <FormField
                            label="Email или Имя пользователя"
                            htmlFor="emailOrUsername"
                            required
                        >
                            <Input
                                id="emailOrUsername"
                                type="text"
                                placeholder="example@email.com"
                                value={formData.emailOrUsername}
                                onChange={handleChange('emailOrUsername')}
                                required
                                disabled={loading}
                                tabIndex={1}
                            />
                        </FormField>

                        <FormField label="Пароль" htmlFor="loginPassword" required>
                            <PasswordInput
                                id="loginPassword"
                                placeholder="••••••••"
                                value={formData.password}
                                onChange={handleChange('password')}
                                required
                                disabled={loading}
                                tabIndex={2}
                            />
                            <div className={styles.forgotPassword}>
                                <button
                                    type="button"
                                    onClick={() => setShowForgotPasswordModal(true)}
                                    className={styles.forgotPasswordLink}
                                    disabled={loading}
                                >
                                    Забыли пароль?
                                </button>
                            </div>
                        </FormField>

                        <Checkbox
                            id="rememberMe"
                            label="Запомнить меня"
                            checked={rememberMe}
                            onChange={(e) => setRememberMe(e.target.checked)}
                            disabled={loading}
                        />
                    </div>

                    <div className={styles.cardFooter}>
                        <Button
                            type="submit"
                            variant="primary"
                            fullWidth
                            loading={loading}
                            disabled={loading}
                            tabIndex={3}
                        >
                            {loading ? 'Вход...' : 'Войти'}
                        </Button>

                        <p className={styles.switchText}>
                            Нужен аккаунт?{' '}
                            <button
                                type="button"
                                onClick={onSwitchToRegister}
                                className={styles.switchLink}
                                disabled={loading}
                            >
                                Зарегистрироваться
                            </button>
                        </p>
                    </div>
                </form>

                <ForgotPasswordModal
                    isOpen={showForgotPasswordModal}
                    onClose={() => setShowForgotPasswordModal(false)}
                />
            </div>
        );
    },
);
