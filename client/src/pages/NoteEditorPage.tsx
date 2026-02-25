import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { NoteViewer } from '@components/notes/NoteViewer';
import { FileSidebar } from '@components/sidebar/FileSidebar';
import { TopBar } from '@components/common/layout/topbar';
import { HomePage } from '@pages/HomePage';
import { ShareModal } from '@components/modals/ShareModal';
import { ActivationBanner } from '@components/modals/ActivationBanner';
import { useAuthStore, useSidebarStore } from '@hooks/useStores';
import $api, { API_URL } from '@http';
import { getToken } from '@utils/tokenStorage';
import * as styles from '@pages/NoteEditorPage.module.css';

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

export const NoteEditorPage: React.FC = () => {
    const { noteId } = useParams<{ noteId: string }>();
    const navigate = useNavigate();
    const authStore = useAuthStore();
    const sidebarStore = useSidebarStore();
    const [note, setNote] = useState<NoteData | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [shareModalOpen, setShareModalOpen] = useState(false);
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
            <div className={styles.pageContainer}>
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
                    <div className={styles.container}>
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
            </div>
        );
    }

    // Авторизованный режим
    return (
        <div className={styles.pageContainer}>
            <ActivationBanner />
            <TopBar
                noteTitle={noteId && note ? note.title : undefined}
                breadcrumbs={noteId && note ? ['Home', note.title || 'Untitled Note'] : ['Home']}
                noteOwnerId={noteId && note ? note.ownerId : undefined}
                noteOwnerLogin={noteOwnerInfo?.login}
                noteOwnerName={noteOwnerInfo?.name}
                isPublic={noteId && note ? note.isPublic : false}
                onShareClick={() => {
                    if (!authStore.user?.isActivated) {
                        return;
                    }
                    if (noteId && note) {
                        setShareModalOpen(true);
                    }
                }}
                collaborators={
                    noteId && note
                        ? note.access?.map((access) => {
                              const user = users.find(
                                  (u) =>
                                      u.id === access.userId ||
                                      u._id === access.userId ||
                                      String(u.id) === String(access.userId) ||
                                      String(u._id) === String(access.userId),
                              );

                              if (user) {
                                  return {
                                      id: access.userId,
                                      name:
                                          user.name ||
                                          user.login ||
                                          user.username ||
                                          `User ${access.userId}`,
                                      login: user.login,
                                      username: user.username,
                                      email: user.email,
                                      isOnline: onlineUserIds.includes(access.userId),
                                  };
                              }

                              return {
                                  id: access.userId,
                                  name: `User ${String(access.userId).slice(0, 8)}`,
                                  isOnline: onlineUserIds.includes(access.userId),
                              };
                          }) || []
                        : []
                }
            />

            {noteId && note && (
                <ShareModal
                    open={shareModalOpen}
                    onOpenChange={setShareModalOpen}
                    noteId={noteId}
                    noteTitle={note.title || 'Untitled Note'}
                />
            )}

            <div className={styles.body}>
                <FileSidebar currentNoteId={noteId && note ? noteId : undefined} />

                <div className={styles.container}>
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
};
