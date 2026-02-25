import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import PasswordService from '@service/PasswordService';
import { useToastContext } from '@contexts/ToastContext';
import { EyeIcon, EyeOffIcon, CheckIcon, LockIcon } from '@components/common/ui/icons';
import { Loader } from '@components/common/ui';
import * as styles from '@pages/ResetPasswordPage.module.css';

export const ResetPasswordPage: React.FC = () => {
    const { token } = useParams<{ token: string }>();
    const navigate = useNavigate();
    const toast = useToastContext();

    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [validating, setValidating] = useState(true);
    const [isValidToken, setIsValidToken] = useState(false);
    const [success, setSuccess] = useState(false);
    const [formData, setFormData] = useState({
        password: '',
        confirmPassword: '',
    });

    // Валидация токена при загрузке страницы
    useEffect(() => {
        let isMounted = true;

        const validateToken = async () => {
            if (!token) {
                if (isMounted) {
                    setValidating(false);
                    setIsValidToken(false);
                }
                return;
            }

            try {
                await PasswordService.validateResetToken(token);
                if (isMounted) {
                    setIsValidToken(true);
                }
            } catch (error: any) {
                if (isMounted) {
                    const errorMessage =
                        error?.response?.data?.message || 'Недействительный или истекший токен';
                    toast.error(errorMessage);
                    setIsValidToken(false);
                }
            } finally {
                if (isMounted) {
                    setValidating(false);
                }
            }
        };

        validateToken();

        return () => {
            isMounted = false;
        };
    }, [token]); // Убрал toast из зависимостей

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.password || !formData.confirmPassword) {
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

        if (!token) {
            toast.error('Токен не найден');
            return;
        }

        setLoading(true);
        try {
            await PasswordService.resetPassword(token, formData.password);
            setSuccess(true);
            toast.success('Пароль успешно изменен');

            // Перенаправляем на страницу входа через 2 секунды
            setTimeout(() => {
                navigate('/');
            }, 2000);
        } catch (error: any) {
            const errorMessage = error?.response?.data?.message || 'Ошибка при сбросе пароля';
            toast.error(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData((prev) => ({ ...prev, [field]: e.target.value }));
    };

    if (validating) {
        return (
            <div className={styles.container}>
                <div className={styles.card}>
                    <Loader variant="spinner" size="lg" text="Проверка токена..." />
                </div>
            </div>
        );
    }

    if (!isValidToken) {
        return (
            <div className={styles.container}>
                <div className={styles.card}>
                    <div className={styles.errorState}>
                        <div className={styles.errorIcon}>✕</div>
                        <h1 className={styles.errorTitle}>Токен недействителен</h1>
                        <p className={styles.errorText}>
                            Ссылка для сброса пароля недействительна или истекла. Пожалуйста,
                            запросите новую ссылку.
                        </p>
                        <button onClick={() => navigate('/')} className={styles.backButton}>
                            Вернуться на главную
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    if (success) {
        return (
            <div className={styles.container}>
                <div className={styles.card}>
                    <div className={styles.successState}>
                        <div className={styles.successIcon}>
                            <CheckIcon className={styles.checkIcon} />
                        </div>
                        <h1 className={styles.successTitle}>Пароль успешно изменен</h1>
                        <p className={styles.successText}>
                            Ваш пароль был успешно изменен. Вы будете перенаправлены на страницу
                            входа...
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <div className={styles.card}>
                <div className={styles.cardHeader}>
                    <div className={styles.iconWrapper}>
                        <LockIcon className={styles.icon} />
                    </div>
                    <h1 className={styles.title}>Сброс пароля</h1>
                    <p className={styles.description}>Введите новый пароль для вашего аккаунта</p>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className={styles.cardContent}>
                        <div className={styles.field}>
                            <label htmlFor="resetPassword" className={styles.label}>
                                Новый пароль
                            </label>
                            <div className={styles.passwordWrapper}>
                                <input
                                    id="resetPassword"
                                    type={showPassword ? 'text' : 'password'}
                                    placeholder="••••••••"
                                    value={formData.password}
                                    onChange={handleChange('password')}
                                    required
                                    className={styles.input}
                                    disabled={loading}
                                    autoFocus
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className={styles.passwordToggle}
                                    disabled={loading}
                                >
                                    {showPassword ? (
                                        <EyeOffIcon className={styles.eyeIcon} />
                                    ) : (
                                        <EyeIcon className={styles.eyeIcon} />
                                    )}
                                </button>
                            </div>
                        </div>

                        <div className={styles.field}>
                            <label htmlFor="resetConfirmPassword" className={styles.label}>
                                Подтверждение пароля
                            </label>
                            <div className={styles.passwordWrapper}>
                                <input
                                    id="resetConfirmPassword"
                                    type={showConfirmPassword ? 'text' : 'password'}
                                    placeholder="••••••••"
                                    value={formData.confirmPassword}
                                    onChange={handleChange('confirmPassword')}
                                    required
                                    className={styles.input}
                                    disabled={loading}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    className={styles.passwordToggle}
                                    disabled={loading}
                                >
                                    {showConfirmPassword ? (
                                        <EyeOffIcon className={styles.eyeIcon} />
                                    ) : (
                                        <EyeIcon className={styles.eyeIcon} />
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className={styles.cardFooter}>
                        <button type="submit" className={styles.submitButton} disabled={loading}>
                            {loading ? 'Сброс пароля...' : 'Сбросить пароль'}
                        </button>

                        <button
                            type="button"
                            onClick={() => navigate('/')}
                            className={styles.cancelButton}
                            disabled={loading}
                        >
                            Отмена
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
