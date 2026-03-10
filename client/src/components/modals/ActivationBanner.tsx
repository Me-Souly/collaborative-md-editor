import React, { useState } from 'react';
import { useAuthStore } from '@hooks/useStores';
import { useToastContext } from '@contexts/ToastContext';
import ActivationService from '@service/ActivationService';
import { observer } from 'mobx-react-lite';
import { MailIcon, RefreshIcon, CheckIcon } from '@components/common/ui/icons';
import * as styles from '@components/modals/ActivationBanner.module.css';

export const ActivationBanner: React.FC = observer(() => {
    const authStore = useAuthStore();
    const toast = useToastContext();
    const [loading, setLoading] = useState(false);
    const [checking, setChecking] = useState(false);

    // Показываем баннер только если: авторизован, сервер доступен, и isActivated явно false
    if (!authStore.isAuth || authStore.isOfflineMode || authStore.user?.isActivated !== false) {
        return null;
    }

    const handleResend = async () => {
        setLoading(true);
        try {
            await ActivationService.resendActivation();
            toast.success('Письмо с активацией отправлено на ваш email');
        } catch (error: any) {
            const errorMessage = error?.response?.data?.message || 'Ошибка при отправке письма';
            toast.error(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    const handleCheckActivation = async () => {
        setChecking(true);
        try {
            // Обновляем данные пользователя, чтобы проверить статус активации
            await authStore.checkAuth();
            if (authStore.user?.isActivated) {
                toast.success('Аккаунт активирован!');
            } else {
                toast.info('Аккаунт еще не активирован. Проверьте email.');
            }
        } catch {
            toast.error('Ошибка при проверке статуса активации');
        } finally {
            setChecking(false);
        }
    };

    return (
        <div className={styles.banner}>
            <div className={styles.bannerContent}>
                <div className={styles.bannerIcon}>
                    <MailIcon className={styles.icon} />
                </div>
                <div className={styles.bannerText}>
                    <p className={styles.bannerDescription}>
                        Подтвердите email <strong>{authStore.user?.email}</strong> — перейдите по ссылке из письма.
                    </p>
                </div>
                <div className={styles.bannerActions}>
                    <button onClick={handleResend} disabled={loading} className={styles.button}>
                        {loading ? (
                            <>
                                <RefreshIcon className={styles.buttonIcon} />
                                Отправка...
                            </>
                        ) : (
                            <>
                                <RefreshIcon className={styles.buttonIcon} />
                                Отправить повторно
                            </>
                        )}
                    </button>
                    <button
                        onClick={handleCheckActivation}
                        disabled={checking}
                        className={styles.button}
                    >
                        {checking ? (
                            <>
                                <CheckIcon className={styles.buttonIcon} />
                                Проверка...
                            </>
                        ) : (
                            <>
                                <CheckIcon className={styles.buttonIcon} />
                                Проверить активацию
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
});
