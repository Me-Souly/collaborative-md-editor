import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@hooks/useStores';
import { useToastContext } from '@contexts/ToastContext';
import { observer } from 'mobx-react-lite';
import { CheckIcon, MailIcon } from '@components/common/ui/icons';
import { Loader } from '@components/common/ui';
import ActivationService from '@service/ActivationService';
import * as styles from '@pages/ActivationPage.module.css';

export const ActivationPage: React.FC = observer(() => {
    const { token } = useParams<{ token: string }>();
    const navigate = useNavigate();
    const authStore = useAuthStore();
    const toast = useToastContext();
    const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
    const [errorMessage, setErrorMessage] = useState<string>('');

    useEffect(() => {
        if (!token) {
            setStatus('error');
            setErrorMessage('Токен активации не найден');
            return;
        }

        // Активация происходит на сервере через API запрос
        const activateAccount = async () => {
            try {
                // Вызываем API для активации
                await ActivationService.activate(token);

                // Обновляем данные пользователя
                await authStore.checkAuth();

                if (authStore.user?.isActivated) {
                    setStatus('success');
                    toast.success('Аккаунт успешно активирован!');
                    setTimeout(() => {
                        navigate('/');
                    }, 2000);
                } else {
                    setStatus('error');
                    setErrorMessage('Активация не удалась. Попробуйте запросить новое письмо.');
                }
            } catch (error: any) {
                setStatus('error');
                const errorMsg =
                    error?.response?.data?.message ||
                    error?.message ||
                    'Ошибка при активации аккаунта';
                setErrorMessage(errorMsg);
                console.error('Activation error:', error);
            }
        };

        activateAccount();
    }, [token, authStore, toast, navigate]);

    if (status === 'loading') {
        return (
            <div className={styles.container}>
                <div className={styles.card}>
                    <Loader variant="spinner" size="lg" text="Активация аккаунта..." />
                </div>
            </div>
        );
    }

    if (status === 'success') {
        return (
            <div className={styles.container}>
                <div className={styles.card}>
                    <div className={styles.successState}>
                        <div className={styles.successIcon}>
                            <CheckIcon className={styles.checkIcon} />
                        </div>
                        <h1 className={styles.successTitle}>Аккаунт активирован!</h1>
                        <p className={styles.successText}>
                            Ваш аккаунт успешно активирован. Вы будете перенаправлены на главную
                            страницу...
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <div className={styles.card}>
                <div className={styles.errorState}>
                    <div className={styles.errorIcon}>
                        <MailIcon className={styles.mailIcon} />
                    </div>
                    <h1 className={styles.errorTitle}>Ошибка активации</h1>
                    <p className={styles.errorText}>{errorMessage}</p>
                    <button onClick={() => navigate('/')} className={styles.backButton}>
                        Вернуться на главную
                    </button>
                </div>
            </div>
        </div>
    );
});
