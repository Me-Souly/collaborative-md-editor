import React, { useState, useEffect, useRef } from 'react';
import { observer } from 'mobx-react-lite';
import { useParams, useNavigate } from 'react-router-dom';
import { NoteViewer } from '@components/notes/NoteViewer';
import { FileSidebar } from '@components/sidebar/FileSidebar';
import { TopBar } from '@components/common/layout/topbar';
import { HomePage } from '@pages/HomePage';
import { ShareModal } from '@components/modals/ShareModal';
import { ActivationBanner } from '@components/modals/ActivationBanner';
import { useAuthStore, useSidebarStore } from '@hooks/useStores';
import { ChevronsLeftIcon } from '@components/common/ui/icons';
import $api, { API_URL } from '@http';
import { getToken } from '@utils/tokenStorage';
import * as styles from '@pages/NoteEditorPage.module.css';
import { GlobeIcon } from '@components/common/ui/icons';

interface NoteData {
    id: string;
    title: string;
    content?: string;
    rendered?: string;
    ownerId: string;
    isPublic: boolean;
    permission?: 'edit' | 'read' | null;
    access: Array<{
        userId: string;
        permission: 'read' | 'edit';
    }>;
}

export const NoteEditorPage: React.FC = observer(() => {
    const { noteId } = useParams<{ noteId: string }>();
    const navigate = useNavigate();
    const authStore = useAuthStore();
    const sidebarStore = useSidebarStore();
    const [note, setNote] = useState<NoteData | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [shareModalOpen, setShareModalOpen] = useState(false);
    const [confirmPublicOpen, setConfirmPublicOpen] = useState(false);
    const [onlineUserIds, setOnlineUserIds] = useState<string[]>([]);
    const [users, setUsers] = useState<any[]>([]);
    const [noteOwnerInfo, setNoteOwnerInfo] = useState<{ login?: string; name?: string } | null>(
        null,
    );
    const lastPresenceKeyRef = useRef<string>('');

    const token = getToken();
    const isGuest = !token;

    // Загрузка заметки
    useEffect(() => {
        // Гость без noteId — отправляем на лендинг
        if (isGuest && !noteId) {
            navigate('/');
            return;
        }

        // Авторизованный без noteId — домашний экран
        if (!isGuest && !noteId) {
            setNote(null);
            setError(null);
            return;
        }

        if (!noteId) return;

        const loadNote = async () => {
            try {
                let noteData: NoteData;

                if (isGuest) {
                    // Гостевой запрос — plain fetch без auth-интерсептора
                    const res = await fetch(`${API_URL}/notes/${noteId}`);
                    if (!res.ok) {
                        if (res.status === 403 || res.status === 404) {
                            setError('У вас нет доступа к этой заметке');
                        } else {
                            setError('Не удалось загрузить заметку');
                        }
                        return;
                    }
                    noteData = await res.json();
                } else {
                    const response = await $api.get(`/notes/${noteId}`);
                    noteData = response.data as NoteData;
                }

                if (!noteData.permission) {
                    setError('У вас нет доступа к этой заметке');
                    return;
                }

                setNote(noteData);

                // Загружаем информацию о владельце заметки
                if (noteData.ownerId) {
                    try {
                        const ownerRes = isGuest
                            ? await fetch(`${API_URL}/users/${noteData.ownerId}`)
                            : await $api.get(`/users/${noteData.ownerId}`);
                        const ownerData = isGuest
                            ? await (ownerRes as Response).json()
                            : (ownerRes as any).data;
                        setNoteOwnerInfo({
                            login: ownerData.login,
                            name: ownerData.name || ownerData.login,
                        });
                    } catch {
                        setNoteOwnerInfo(null);
                    }
                }
            } catch (err: any) {
                const status = err.response?.status;
                if (status === 403 || status === 404) {
                    setError('У вас нет доступа к этой заметке');
                } else if (!isGuest && !status) {
                    // Сервер недоступен — оффлайн-режим для авторизованного пользователя.
                    // NoteViewer загрузит контент из IndexedDB (y-indexeddb)
                    setNote({
                        id: noteId!,
                        title: 'Оффлайн-режим',
                        ownerId: authStore.user?.id || '',
                        isPublic: false,
                        permission: 'edit',
                        access: [],
                    });
                } else {
                    setError(err.response?.data?.message || 'Не удалось загрузить заметку');
                }
            }
        };

        loadNote();
    }, [noteId, navigate, isGuest, authStore.user?.id]);

    // Sidebar data — только для авторизованных
    useEffect(() => {
        if (isGuest) return;

        let isCancelled = false;

        const loadSidebarData = async () => {
            try {
                const [foldersResponse, notesResponse, usersResponse] = await Promise.all([
                    $api.get('/folders'),
                    $api.get('/notes'),
                    $api.get('/users').catch(() => ({ data: [] })),
                ]);

                if (isCancelled) return;

                const foldersData = Array.isArray(foldersResponse.data) ? foldersResponse.data : [];
                const notesData = Array.isArray(notesResponse.data) ? notesResponse.data : [];
                const usersData = Array.isArray(usersResponse.data) ? usersResponse.data : [];

                setUsers(usersData);
                sidebarStore.buildFileTree(foldersData, notesData);

                // Кэшируем данные sidebar для оффлайн-режима
                try {
                    localStorage.setItem(
                        'sidebarCache',
                        JSON.stringify({ folders: foldersData, notes: notesData }),
                    );
                } catch {
                    /* ignore */
                }

                if (noteId) {
                    sidebarStore.setSelectedNoteId(noteId);
                    const currentNote = notesData.find((n: any) => n.id === noteId);
                    if (currentNote?.folderId) {
                        sidebarStore.expandFolderPath(currentNote.folderId);
                    }
                }
            } catch (treeError) {
                console.error('Failed to load folders or notes for sidebar:', treeError);
                // Оффлайн: пробуем восстановить дерево из кэша
                try {
                    const cached = localStorage.getItem('sidebarCache');
                    if (cached) {
                        const { folders, notes } = JSON.parse(cached);
                        sidebarStore.buildFileTree(folders, notes);
                        if (noteId) sidebarStore.setSelectedNoteId(noteId);
                        return;
                    }
                } catch {
                    /* ignore */
                }
                sidebarStore.setFileTree([]);
            }
        };

        loadSidebarData();

        return () => {
            isCancelled = true;
        };
    }, [noteId, sidebarStore, isGuest]);

    // Presence — только для авторизованных
    useEffect(() => {
        if (isGuest || !noteId) {
            setOnlineUserIds([]);
            lastPresenceKeyRef.current = '';
            return;
        }

        let cancelled = false;

        const fetchPresence = async () => {
            try {
                const res = await $api.get(`/notes/${noteId}/presence`, {
                    skipErrorToast: true,
                } as any);
                const ids: string[] = Array.isArray(res.data?.userIds) ? res.data.userIds : [];
                if (!cancelled) {
                    const key = ids.slice().sort().join(',');
                    if (key !== lastPresenceKeyRef.current) {
                        lastPresenceKeyRef.current = key;
                        setOnlineUserIds(ids);
                    }
                }
            } catch {
                // тихо игнорируем
            }
        };

        fetchPresence();
        const interval = setInterval(fetchPresence, 30000);

        return () => {
            cancelled = true;
            clearInterval(interval);
        };
    }, [noteId, isGuest]);

    // Проверка доступа
    if (noteId && note && !note.permission) {
        return (
            <div className={styles.errorContainer}>
                <h2 className={styles.errorTitle}>Доступ запрещен</h2>
                <p className={styles.errorMessage}>{error || 'У вас нет доступа к этой заметке'}</p>
                <button onClick={() => navigate(-1)} className={styles.errorButton}>
                    Назад
                </button>
            </div>
        );
    }

    // Ошибка загрузки
    if (noteId && error && !note) {
        return (
            <div className={styles.errorContainer}>
                <h2 className={styles.errorTitle}>{isGuest ? 'Заметка недоступна' : 'Ошибка'}</h2>
                <p className={styles.errorMessage}>{error}</p>
                {isGuest ? (
                    <button onClick={() => navigate('/')} className={styles.errorButton}>
                        На главную
                    </button>
                ) : (
                    <button onClick={() => navigate(-1)} className={styles.errorButton}>
                        Назад
                    </button>
                )}
            </div>
        );
    }

    // Гостевой режим просмотра заметки
    if (isGuest && noteId && note) {
        return (
            <div className={`${styles.pageContainer} ${styles.guestPageContainer}`}>
                <header className={styles.guestHeader}>
                    <div className={styles.guestHeaderLeft}>
                        <button className={styles.guestLogoBtn} onClick={() => navigate('/')}>
                            <span className={styles.guestLogoIcon}>N</span>
                            <span className={styles.guestLogoText}>Note Editor</span>
                        </button>
                        <span className={styles.guestSeparator}>/</span>
                        <span className={styles.guestNoteTitle}>
                            {note.title || 'Без названия'}
                        </span>
                        {noteOwnerInfo && (
                            <span className={styles.guestAuthor}>
                                {noteOwnerInfo.name || noteOwnerInfo.login}
                            </span>
                        )}
                    </div>
                    <div className={styles.guestHeaderRight}>
                        <span className={styles.guestBadge}>Только чтение</span>
                        <button className={styles.guestLoginBtn} onClick={() => navigate('/login')}>
                            Войти
                        </button>
                        <button
                            className={styles.guestRegisterBtn}
                            onClick={() => navigate('/login')}
                        >
                            Регистрация
                        </button>
                    </div>
                </header>

                <div className={styles.body}>
                    <div className={styles.editorContainer}>
                        <NoteViewer
                            noteId={noteId}
                            permission="read"
                            getToken={() => null}
                            initialMarkdown={note.rendered || ''}
                            ownerId={note.ownerId}
                            isPublic={note.isPublic}
                        />
                    </div>
                </div>
            </div>
        );
    }

    const isOwner = note ? note.ownerId === authStore.user?.id : false;

    const handleTogglePublic = async () => {
        if (!noteId || !note || !isOwner) return;
        if (!note.isPublic) {
            // private → public: ask for confirmation
            setConfirmPublicOpen(true);
            return;
        }
        await doTogglePublic();
    };

    const doTogglePublic = async () => {
        if (!noteId || !note) return;
        try {
            await $api.put(`/notes/${noteId}`, { isPublic: !note.isPublic });
            setNote((prev) => (prev ? { ...prev, isPublic: !prev.isPublic } : prev));
        } catch (e) {
            console.error('Failed to toggle public', e);
        }
    };

    // Авторизованный режим
    return (
        <div className={styles.pageContainer}>
            <FileSidebar currentNoteId={noteId && note ? noteId : undefined} />

            {sidebarStore.collapsed && (
                <div
                    className={styles.accentStrip}
                    onClick={() => sidebarStore.toggleCollapse()}
                    title="Open sidebar"
                />
            )}
            <button
                className={`${styles.sidebarToggleBtn} ${sidebarStore.collapsed ? styles.sidebarToggleBtnCollapsed : ''}`}
                onClick={() => sidebarStore.toggleCollapse()}
                title={sidebarStore.collapsed ? 'Open sidebar' : 'Close sidebar'}
            >
                <ChevronsLeftIcon className={`${styles.sidebarToggleIcon} ${sidebarStore.collapsed ? styles.sidebarToggleIconCollapsed : ''}`} />
            </button>

            <div className={styles.rightColumn}>
                <ActivationBanner />
                <TopBar
                    noteTitle={noteId && note ? note.title : undefined}
                    breadcrumbs={noteId && note ? ['Home', note.title || 'Untitled Note'] : ['Home']}
                    noteOwnerId={noteId && note ? note.ownerId : undefined}
                    noteOwnerLogin={noteOwnerInfo?.login}
                    noteOwnerName={noteOwnerInfo?.name}
                    isPublic={noteId && note ? note.isPublic : false}
                    onTogglePublic={noteId && note && isOwner ? handleTogglePublic : undefined}
                    onShareClick={() => {
                        if (!authStore.user?.isActivated) {
                            return;
                        }
                        if (noteId && note) {
                            setShareModalOpen(true);
                        }
                    }}
                    collaborators={(() => {
                        if (!noteId || !note || !note.access?.length) return [];
                        const currentUserId = authStore.user?.id;
                        const result: Array<{
                            id: string;
                            name: string;
                            login?: string;
                            isOnline: boolean;
                        }> = [];

                        // Владелец (если не текущий пользователь)
                        if (note.ownerId && String(note.ownerId) !== String(currentUserId)) {
                            result.push({
                                id: note.ownerId,
                                name:
                                    noteOwnerInfo?.name ||
                                    noteOwnerInfo?.login ||
                                    `User ${String(note.ownerId).slice(0, 8)}`,
                                login: noteOwnerInfo?.login,
                                isOnline: onlineUserIds.includes(note.ownerId),
                            });
                        }

                        // Пользователи из списка доступов (кроме текущего)
                        for (const access of note.access) {
                            if (String(access.userId) === String(currentUserId)) continue;
                            const user = users.find(
                                (u) =>
                                    String(u.id ?? u._id) === String(access.userId),
                            );
                            result.push({
                                id: access.userId,
                                name: user
                                    ? user.name || user.login || `User ${String(access.userId).slice(0, 8)}`
                                    : `User ${String(access.userId).slice(0, 8)}`,
                                login: user?.login,
                                isOnline: onlineUserIds.includes(access.userId),
                            });
                        }

                        return result;
                    })()}
                />

                {noteId && note && (
                    <ShareModal
                        open={shareModalOpen}
                        onOpenChange={setShareModalOpen}
                        noteId={noteId}
                        noteTitle={note.title || 'Untitled Note'}
                    />
                )}

                {confirmPublicOpen && (
                    <ConfirmPublicModal
                        onConfirm={async () => {
                            setConfirmPublicOpen(false);
                            await doTogglePublic();
                        }}
                        onCancel={() => setConfirmPublicOpen(false)}
                    />
                )}

                <div className={styles.body}>
                    <div className={styles.editorContainer}>
                        {noteId && note && note.permission ? (
                            <NoteViewer
                                noteId={noteId}
                                permission={note.permission as 'edit' | 'read'}
                                getToken={() => getToken()}
                                initialMarkdown={note.rendered || ''}
                                ownerId={note.ownerId}
                                isPublic={note.isPublic}
                            />
                        ) : !noteId ? (
                            <HomePage />
                        ) : null}
                    </div>
                </div>
            </div>
        </div>
    );
});

function ConfirmPublicModal({
    onConfirm,
    onCancel,
}: {
    onConfirm: () => void;
    onCancel: () => void;
}) {
    return (
        <div className={styles.confirmOverlay} onClick={onCancel}>
            <div className={styles.confirmModal} onClick={(e) => e.stopPropagation()}>
                <div className={styles.confirmIcon}>
                    <GlobeIcon className={styles.confirmGlobeIcon} />
                </div>
                <h3 className={styles.confirmTitle}>Make note public?</h3>
                <p className={styles.confirmText}>
                    Anyone with the link will be able to view this note. Make sure it
                    doesn't contain sensitive information.
                </p>
                <div className={styles.confirmActions}>
                    <button className={styles.confirmCancel} onClick={onCancel}>
                        Cancel
                    </button>
                    <button className={styles.confirmOk} onClick={onConfirm}>
                        Make public
                    </button>
                </div>
            </div>
        </div>
    );
}
