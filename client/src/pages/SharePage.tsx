import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { observer } from 'mobx-react-lite';
import { useAuthStore } from '@hooks/useStores';
import { useToastContext } from '@contexts/ToastContext';
import { Loader } from '@components/common/ui';
import { GlobeIcon, LockIcon } from '@components/common/ui/icons';
import { API_URL } from '@http';
import $api from '@http';
import * as styles from '@pages/SharePage.module.css';

interface ShareLinkInfo {
    noteId: string;
    title: string;
    permission: 'read' | 'edit';
    expiresAt: string | null;
}

type PageState = 'loading' | 'ready' | 'error' | 'expired';

export const SharePage: React.FC = observer(() => {
    const { token } = useParams<{ token: string }>();
    const navigate = useNavigate();
    const authStore = useAuthStore();
    const toast = useToastContext();

    const [state, setState] = useState<PageState>('loading');
    const [info, setInfo] = useState<ShareLinkInfo | null>(null);
    const [errorMsg, setErrorMsg] = useState('');

    const isGuest = !authStore.isAuth;

    useEffect(() => {
        if (!token) {
            setState('error');
            setErrorMsg('Ссылка недействительна');
            return;
        }

        const load = async () => {
            try {
                const res = await fetch(`${API_URL}/share-link/${token}/info`);
                if (!res.ok) {
                    const body = await res.json().catch(() => ({}));
                    if (res.status === 400) {
                        setState('expired');
                    } else {
                        setState('error');
                        setErrorMsg(body.message || 'Ссылка не найдена');
                    }
                    return;
                }
                const data = await res.json();
                setInfo(data);
                setState('ready');
            } catch {
                setState('error');
                setErrorMsg('Не удалось загрузить информацию о ссылке');
            }
        };

        load();
    }, [token]);

    const handleOpen = async () => {
        if (!info || !token) return;

        if (isGuest) {
            // Гость с read-ссылкой → открываем заметку с shareToken
            navigate(`/note/${info.noteId}?shareToken=${token}`);
            return;
        }

        // Авторизованный пользователь → redirect с shareToken, connect в фоне
        $api.post('/share-link/connect', { token }).catch(() => {});
        navigate(`/note/${info.noteId}?shareToken=${token}`);
    };

    const handleLoginToEdit = () => {
        navigate(`/login?returnTo=/share/${token}`);
    };

    if (state === 'loading') {
        return (
            <div className={styles.container}>
                <div className={styles.card}>
                    <Loader variant="spinner" size="lg" text="Загрузка..." />
                </div>
            </div>
        );
    }

    if (state === 'expired') {
        return (
            <div className={styles.container}>
                <div className={styles.card}>
                    <div className={styles.iconWrap} data-variant="warn">
                        <LockIcon className={styles.icon} />
                    </div>
                    <h1 className={styles.title}>Ссылка истекла</h1>
                    <p className={styles.desc}>Срок действия этой ссылки закончился. Попросите владельца создать новую.</p>
                    <button className={styles.btnPrimary} onClick={() => navigate('/')}>
                        На главную
                    </button>
                </div>
            </div>
        );
    }

    if (state === 'error') {
        return (
            <div className={styles.container}>
                <div className={styles.card}>
                    <div className={styles.iconWrap} data-variant="danger">
                        <LockIcon className={styles.icon} />
                    </div>
                    <h1 className={styles.title}>Ссылка недействительна</h1>
                    <p className={styles.desc}>{errorMsg || 'Эта ссылка не существует или была отозвана.'}</p>
                    <button className={styles.btnPrimary} onClick={() => navigate('/')}>
                        На главную
                    </button>
                </div>
            </div>
        );
    }

    if (!info) return null;

    const canGuestRead = isGuest && info.permission === 'read';
    const guestNeedsLogin = isGuest && info.permission === 'edit';

    return (
        <div className={styles.container}>
            <div className={styles.card}>
                <div className={styles.iconWrap} data-variant="accent">
                    <GlobeIcon className={styles.icon} />
                </div>

                <h1 className={styles.title}>{info.title || 'Без названия'}</h1>

                <div className={styles.meta}>
                    <span className={styles.permBadge} data-perm={info.permission}>
                        {info.permission === 'edit' ? 'Редактирование' : 'Только просмотр'}
                    </span>
                    {info.expiresAt && (
                        <span className={styles.expiryBadge}>
                            До {new Date(info.expiresAt).toLocaleDateString('ru-RU')}
                        </span>
                    )}
                </div>

                {guestNeedsLogin ? (
                    <>
                        <p className={styles.desc}>
                            Можете просматривать без регистрации. Чтобы редактировать — войдите в аккаунт.
                        </p>
                        <div className={styles.actions}>
                            <button className={styles.btnPrimary} onClick={handleOpen}>
                                Открыть (только чтение)
                            </button>
                            <button className={styles.btnSecondary} onClick={handleLoginToEdit}>
                                Войти для редактирования
                            </button>
                        </div>
                    </>
                ) : (
                    <>
                        <p className={styles.desc}>
                            {canGuestRead
                                ? 'Вы можете просматривать эту заметку без регистрации.'
                                : 'Нажмите кнопку ниже, чтобы открыть заметку.'}
                        </p>
                        <div className={styles.actions}>
                            <button
                                className={styles.btnPrimary}
                                onClick={handleOpen}
                            >
                                {canGuestRead ? 'Открыть (только чтение)' : 'Открыть заметку'}
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
});
