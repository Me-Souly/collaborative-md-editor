import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuthStore } from '@hooks/useStores';
import $api from '@http';
import { useToastContext } from '@contexts/ToastContext';
import ModeratorService from '@service/ModeratorService';
import { Modal } from '@components/common/ui/Modal';
import { Loader } from '@components/common/ui';
import { ArrowLeftIcon, FileTextIcon, GlobeIcon, GridIcon, ListIcon } from '@components/common/ui/icons';
import { CustomSelect } from '@components/common/ui/CustomSelect';
import { NoteCard } from '@components/notes/NoteCard';
import * as styles from '@pages/PublicProfilePage.module.css';

type SortOption = 'recent' | 'popular' | 'oldest';

interface PublicUser {
    id: string;
    name: string;
    login: string;
    avatarUrl?: string | null;
    about?: string | null;
}

interface PublicNote {
    id: string;
    title: string;
    excerpt?: string;
    rendered?: string;
    searchableContent?: string;
    meta?: { excerpt?: string; views?: number };
    updatedAt: string;
    createdAt: string;
    isFavorite?: boolean;
    isShared?: boolean;
}

const getInitials = (name: string) =>
    name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2) || 'U';

const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('en', { day: 'numeric', month: 'short' });

export const PublicProfilePage: React.FC = () => {
    const { userId } = useParams<{ userId: string }>();
    const navigate = useNavigate();
    const toast = useToastContext();
    const authStore = useAuthStore();

    const [user, setUser] = useState<PublicUser | null>(null);
    const [notes, setNotes] = useState<PublicNote[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [sortBy, setSortBy] = useState<SortOption>('recent');
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [blockModalOpen, setBlockModalOpen] = useState(false);
    const [noteToBlock, setNoteToBlock] = useState<PublicNote | null>(null);

    useEffect(() => {
        if (!userId) return;
        setLoading(true);

        Promise.all([
            $api.get(`/users/${userId}`).catch(() => ({ data: null })),
            $api.get('/notes/public').catch(() => ({ data: [] })),
        ])
            .then(([userRes, notesRes]) => {
                if (!userRes.data) { setError('User not found'); return; }

                const raw = userRes.data;
                const mappedUser: PublicUser = {
                    id: raw.id || raw._id,
                    name: raw.name || raw.login || 'User',
                    login: raw.login,
                    avatarUrl: raw.avatarUrl || null,
                    about: raw.about || null,
                };

                const publicNotes: PublicNote[] = (Array.isArray(notesRes.data) ? notesRes.data : [])
                    .filter((n: any) => n.ownerId && String(n.ownerId) === String(mappedUser.id))
                    .map((n: any) => {
                        const excerpt =
                            n.meta?.excerpt || n.meta?.searchableContent?.trim().slice(0, 200);
                        return {
                            id: n.id,
                            title: n.title || 'Untitled',
                            excerpt,
                            rendered: n.rendered,
                            searchableContent: n.meta?.searchableContent,
                            meta: { excerpt, views: n.meta?.views ?? 0 },
                            updatedAt: n.updatedAt,
                            createdAt: n.createdAt,
                            isFavorite: n.meta?.isFavorite ?? false,
                            isShared: n.isPublic ?? false,
                        };
                    });

                setUser(mappedUser);
                setNotes(publicNotes);
                setError(null);
            })
            .catch((e: any) => {
                setError(e?.response?.data?.message || 'Failed to load profile');
                toast.error('Failed to load user profile');
            })
            .finally(() => setLoading(false));
    }, [userId, toast]);

    const sortedNotes = useMemo(() => {
        const copy = [...notes];
        copy.sort((a, b) => {
            if (sortBy === 'popular') return (b.meta?.views ?? 0) - (a.meta?.views ?? 0);
            if (sortBy === 'oldest')
                return new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
            return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
        });
        return copy;
    }, [notes, sortBy]);

    const isModerator = authStore.user?.role === 'moderator';

    const handleBlockNote = (noteId: string) => {
        const note = notes.find((n) => n.id === noteId);
        if (note) { setNoteToBlock(note); setBlockModalOpen(true); }
    };

    const handleConfirmBlock = async () => {
        if (!noteToBlock) return;
        try {
            await ModeratorService.blockNote(noteToBlock.id);
            setNotes((prev) => prev.filter((n) => n.id !== noteToBlock.id));
            toast.success('Note blocked');
            setBlockModalOpen(false);
            setNoteToBlock(null);
        } catch (e: any) {
            toast.error(e?.response?.data?.message || 'Failed to block note');
        }
    };

    if (loading) return <Loader fullScreen variant="spinner" size="lg" text="Loading profile..." />;

    if (error || !user) {
        return (
            <div className={styles.page}>
                <header className={styles.topbar}>
                    <button className={styles.topbarBack} onClick={() => navigate(-1)}>
                        <ArrowLeftIcon className={styles.topbarBackIcon} />
                        Public profile
                    </button>
                </header>
                <div className={styles.content}>
                    <div className={styles.emptyState}>
                        <GlobeIcon className={styles.emptyIcon} />
                        <p className={styles.emptyTitle}>Profile not found</p>
                        <p className={styles.emptyText}>
                            The user profile you are looking for does not exist or is unavailable.
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.page}>
            {/* Topbar */}
            <header className={styles.topbar}>
                <button className={styles.topbarBack} onClick={() => navigate(-1)}>
                    <ArrowLeftIcon className={styles.topbarBackIcon} />
                    Public profile
                </button>
            </header>

            <div className={styles.content}>
                {/* User header */}
                <div className={styles.userHeader}>
                    <div className={styles.avatar}>
                        {user.avatarUrl ? (
                            <img src={user.avatarUrl} alt={user.name} className={styles.avatarImage} />
                        ) : (
                            getInitials(user.name)
                        )}
                    </div>
                    <div className={styles.userInfo}>
                        <h1 className={styles.userName}>{user.name}</h1>
                        <p className={styles.userLogin}>@{user.login}</p>
                        <p className={styles.userMeta}>{sortedNotes.length} public notes</p>
                        {user.about && <p className={styles.userBio}>{user.about}</p>}
                    </div>
                    <div className={styles.userActions}>
                        <button
                            className={styles.btnPrimary}
                            onClick={() => toast.info('Follow is not implemented yet')}
                        >
                            Follow
                        </button>
                        <button
                            className={styles.btnSecondary}
                            onClick={() => toast.info('Messaging is not implemented yet')}
                        >
                            Message
                        </button>
                    </div>
                </div>

                {/* Notes section */}
                <div>
                    {/* Section header */}
                    <div className={styles.sectionHeader}>
                        <div className={styles.sectionLabel}>
                            <span className={styles.sectionLabelText}>
                                {user.name}&apos;s public notes
                            </span>
                            <div className={styles.sectionDivider} />
                        </div>
                        <div className={styles.controls}>
                            <CustomSelect
                                value={sortBy}
                                options={[
                                    { value: 'recent', label: 'Most Recent' },
                                    { value: 'popular', label: 'Most Popular' },
                                    { value: 'oldest', label: 'Oldest First' },
                                ]}
                                onChange={(v) => setSortBy(v as SortOption)}
                            />
                            <div className={styles.viewToggle}>
                                <button
                                    className={styles.viewBtn}
                                    style={{ color: viewMode === 'grid' ? 'var(--accent-color)' : undefined }}
                                    onClick={() => setViewMode('grid')}
                                    title="Grid view"
                                >
                                    <GridIcon className={styles.viewBtnIcon} />
                                </button>
                                <button
                                    className={styles.viewBtn}
                                    style={{ color: viewMode === 'list' ? 'var(--accent-color)' : undefined }}
                                    onClick={() => setViewMode('list')}
                                    title="List view"
                                >
                                    <ListIcon className={styles.viewBtnIcon} />
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Notes */}
                    {sortedNotes.length === 0 ? (
                        <div className={styles.emptyState}>
                            <GlobeIcon className={styles.emptyIcon} />
                            <p className={styles.emptyTitle}>No public notes yet</p>
                            <p className={styles.emptyText}>
                                {user.name} hasn&apos;t shared any notes yet.
                            </p>
                        </div>
                    ) : (
                        <div className={viewMode === 'grid' ? styles.notesGrid : styles.notesList}>
                            {sortedNotes.map((note) => (
                                <NoteCard
                                    key={note.id}
                                    note={note}
                                    viewMode={viewMode}
                                    readOnly
                                    showBlockButton={isModerator}
                                    onBlock={handleBlockNote}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </div>

            <Modal
                isOpen={blockModalOpen}
                onClose={() => setBlockModalOpen(false)}
                title="Block public note?"
                message={`Are you sure you want to block "${noteToBlock?.title}"?\n\nThe note will be made private and hidden from public access.`}
                confirmText="Block"
                cancelText="Cancel"
                onConfirm={handleConfirmBlock}
                variant="danger"
            />
        </div>
    );
};
