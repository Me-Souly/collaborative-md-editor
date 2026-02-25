import React, { useState, useEffect } from 'react';
import { useAuthStore } from '@hooks/useStores';
import { useToastContext } from '@contexts/ToastContext';
import { observer } from 'mobx-react-lite';
import * as styles from '@components/auth/ForgotPasswordModal.module.css';

interface ForgotPasswordModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const ForgotPasswordModal: React.FC<ForgotPasswordModalProps> = observer(
    ({ isOpen, onClose }) => {
        const authStore = useAuthStore();
        const toast = useToastContext();
        const [email, setEmail] = useState('');
        const [loading, setLoading] = useState(false);
        const [success, setSuccess] = useState(false);

        const handleSubmit = async (e: React.FormEvent) => {
            e.preventDefault();

            if (!email) {
                toast.warning('Введите email');
                return;
            }

            setLoading(true);
            try {
                await authStore.requestReset(email);
                setSuccess(true);
                toast.success('Инструкции по восстановлению пароля отправлены на ваш email');
            } catch (error: any) {
                const errorMessage =
                    error?.response?.data?.message || 'Ошибка при отправке запроса';
                toast.error(errorMessage);
            } finally {
                setLoading(false);
            }
        };

        const handleClose = () => {
            setEmail('');
            setSuccess(false);
            onClose();
        };

        useEffect(() => {
            if (isOpen) {
                document.body.style.overflow = 'hidden';
            } else {
                document.body.style.overflow = '';
            }
            return () => {
                document.body.style.overflow = '';
            };
        }, [isOpen]);

        useEffect(() => {
            const handleEscape = (e: KeyboardEvent) => {
                if (e.key === 'Escape' && isOpen) {
                    handleClose();
                }
            };
            document.addEventListener('keydown', handleEscape);
            return () => document.removeEventListener('keydown', handleEscape);
        }, [isOpen]);

        if (!isOpen) return null;

        return (
            <div className={styles.overlay} onClick={handleClose}>
                <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                    <div className={styles.modalHeader}>
                        <h2 className={styles.title}>Восстановление пароля</h2>
                        <button
                            type="button"
                            onClick={handleClose}
                            className={styles.closeButton}
                            aria-label="Закрыть"
                        >
                            ×
                        </button>
                    </div>

                    <div className={styles.modalBody}>
                        {success ? (
                            <div className={styles.successContent}>
                                <div className={styles.successIcon}>✓</div>
                                <h3 className={styles.successTitle}>Проверьте почту</h3>
                                <p className={styles.successText}>
                                    Мы отправили инструкции по восстановлению пароля на адрес{' '}
                                    <strong>{email}</strong>
                                </p>
                                <p className={styles.successHint}>
                                    Если письмо не пришло, проверьте папку "Спам" или попробуйте еще
                                    раз через несколько минут.
                                </p>
                                <button
                                    type="button"
                                    onClick={handleClose}
                                    className={styles.closeSuccessButton}
                                >
                                    Закрыть
                                </button>
                            </div>
                        ) : (
                            <>
                                <p className={styles.description}>
                                    Введите email, который вы использовали при регистрации. Мы
                                    отправим вам инструкции по восстановлению пароля.
                                </p>
                                <form onSubmit={handleSubmit} className={styles.form}>
                                    <div className={styles.field}>
                                        <label htmlFor="resetEmail" className={styles.label}>
                                            Email
                                        </label>
                                        <input
                                            id="resetEmail"
                                            type="email"
                                            placeholder="example@email.com"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            required
                                            className={styles.input}
                                            disabled={loading}
                                            autoFocus
                                        />
                                    </div>

                                    <div className={styles.actions}>
                                        <button
                                            type="button"
                                            onClick={handleClose}
                                            className={styles.cancelButton}
                                            disabled={loading}
                                        >
                                            Отмена
                                        </button>
                                        <button
                                            type="submit"
                                            className={styles.submitButton}
                                            disabled={loading}
                                        >
                                            {loading ? 'Отправка...' : 'Отправить'}
                                        </button>
                                    </div>
                                </form>
                            </>
                        )}
                    </div>
                </div>
            </div>
        );
    },
);
