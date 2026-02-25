import React, { useEffect, useMemo, useState } from 'react';
import { NoteCard } from '@components/notes/NoteCard';
import { CustomSelect } from '@components/common/ui/CustomSelect';
import { Loader } from '@components/common/ui';
import $api from '@http';
import * as styles from '@pages/HomePage.module.css';
import { GridIcon, ListIcon } from '@components/common/ui/icons';

type ViewMode = 'grid' | 'list';
type SortOption = 'date-edited' | 'date-created' | 'a-z' | 'z-a';

interface HomeNote {
    id: string;
    title: string;
    rendered?: string;
    excerpt?: string;
    searchableContent?: string;
    updatedAt: string;
    createdAt: string;
    isFavorite?: boolean;
    isShared?: boolean;
}

const HOME_NOTES_CACHE_KEY = 'homeNotesCache';

const mapNote = (n: any): HomeNote => {
    let excerpt = n.meta?.excerpt;
    if (!excerpt && n.meta?.searchableContent) {
        excerpt = n.meta.searchableContent.trim().slice(0, 200);
    }
    return {
        id: n.id,
        title: n.title || 'Untitled',
        rendered: n.rendered,
        excerpt: excerpt,
        searchableContent: n.meta?.searchableContent,
        updatedAt: n.updatedAt,
        createdAt: n.createdAt,
        isFavorite: n.meta?.isFavorite ?? false,
        isShared: n.isPublic ?? false,
    };
};

export const HomePage: React.FC = () => {
    const [notes, setNotes] = useState<HomeNote[]>([]);
    const [sharedNotes, setSharedNotes] = useState<HomeNote[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isOffline, setIsOffline] = useState(false);
    const [viewMode, setViewMode] = useState<ViewMode>('grid');
    const [sortBy, setSortBy] = useState<SortOption>('date-edited');

    useEffect(() => {
        const loadNotes = async () => {
            try {
                setLoading(true);
                const [ownNotesRes, sharedNotesRes] = await Promise.all([
                    $api.get('/notes'),
                    $api.get('/notes/shared').catch(() => ({ data: [] })),
                ]);

                const ownData = Array.isArray(ownNotesRes.data) ? ownNotesRes.data : [];
                const sharedData = Array.isArray(sharedNotesRes.data) ? sharedNotesRes.data : [];

                const mappedOwn = ownData.map(mapNote);
                const mappedShared = sharedData.map(mapNote);

                setNotes(mappedOwn);
                setSharedNotes(mappedShared);
                setIsOffline(false);
                setError(null);

                // Кэшируем для оффлайн-режима
                try {
                    localStorage.setItem(
                        HOME_NOTES_CACHE_KEY,
                        JSON.stringify({ notes: mappedOwn, sharedNotes: mappedShared }),
                    );
                } catch {
                    /* ignore */
                }
            } catch (e: any) {
                if (!e?.response) {
                    // Сетевая ошибка — пробуем кэш
                    try {
                        const cached = localStorage.getItem(HOME_NOTES_CACHE_KEY);
                        if (cached) {
                            const { notes: cn, sharedNotes: cs } = JSON.parse(cached);
                            setNotes(cn || []);
                            setSharedNotes(cs || []);
                            setIsOffline(true);
                            setError(null);
                        } else {
                            setError('Нет подключения к серверу');
                        }
                    } catch {
                        setError('Нет подключения к серверу');
                    }
                } else {
                    setError(e?.response?.data?.message || 'Failed to load notes');
                }
            } finally {
                setLoading(false);
            }
        };

        loadNotes();
    }, []);

    const sortedNotes = useMemo(() => {
        const copy = [...notes];
        copy.sort((a, b) => {
            const aUpdated = new Date(a.updatedAt).getTime();
            const bUpdated = new Date(b.updatedAt).getTime();
            const aCreated = new Date(a.createdAt).getTime();
            const bCreated = new Date(b.createdAt).getTime();

            switch (sortBy) {
                case 'date-edited':
                    return bUpdated - aUpdated;
                case 'date-created':
                    return bCreated - aCreated;
                case 'a-z':
                    return a.title.localeCompare(b.title);
                case 'z-a':
                    return b.title.localeCompare(a.title);
                default:
                    return 0;
            }
        });
        return copy;
    }, [notes, sortBy]);

    const recentNotes = sortedNotes.slice(0, 5);
    const favoriteNotes = sortedNotes.filter((n) => n.isFavorite);

    // Sort shared notes
    const sortedSharedNotes = useMemo(() => {
        const copy = [...sharedNotes];
        copy.sort((a, b) => {
            const aUpdated = new Date(a.updatedAt).getTime();
            const bUpdated = new Date(b.updatedAt).getTime();
            const aCreated = new Date(a.createdAt).getTime();
            const bCreated = new Date(b.createdAt).getTime();

            switch (sortBy) {
                case 'date-edited':
                    return bUpdated - aUpdated;
                case 'date-created':
                    return bCreated - aCreated;
                case 'a-z':
                    return a.title.localeCompare(b.title);
                case 'z-a':
                    return b.title.localeCompare(a.title);
                default:
                    return 0;
            }
        });
        return copy;
    }, [sharedNotes, sortBy]);

    const handleDeleteNote = (noteId: string) => {
        setNotes((prev) => prev.filter((n) => n.id !== noteId));
    };

    const renderSection = (title: string, items: HomeNote[]) => {
        if (!items.length) return null;

        return (
            <section className={styles.section}>
                <h2 className={styles.sectionTitle}>{title}</h2>
                <div className={viewMode === 'grid' ? styles.grid : styles.list}>
                    {items.map((note) => (
                        <NoteCard
                            key={note.id}
                            note={note}
                            viewMode={viewMode}
                            onDelete={() => handleDeleteNote(note.id)}
                        />
                    ))}
                </div>
            </section>
        );
    };

    if (loading) {
        return <Loader fullScreen variant="spinner" size="lg" text="Загрузка заметок..." />;
    }

    if (error) {
        return (
            <div className={styles.error}>
                <p>{error}</p>
            </div>
        );
    }

    if (!notes.length) {
        return (
            <div className={styles.empty}>
                <h1 className={styles.emptyTitle}>Добро пожаловать в NoteMark</h1>
                <p className={styles.emptyText}>
                    У вас пока нет заметок. Создайте первую заметку через левое меню.
                </p>
            </div>
        );
    }

    return (
        <div className={styles.homePage}>
            <div className={styles.homeInner}>
                <div className={styles.homeHeader}>
                    <h1 className={styles.homeTitle}>
                        Your Notes
                        {isOffline && <span className={styles.offlineBadge}>оффлайн</span>}
                    </h1>
                    <div className={styles.homeControls}>
                        <div className={styles.viewModeToggle}>
                            <button
                                className={`${styles.viewModeButton} ${viewMode === 'grid' ? styles.active : ''}`}
                                onClick={() => setViewMode('grid')}
                                title="Grid view"
                            >
                                <GridIcon className={styles.viewModeIcon} />
                            </button>
                            <button
                                className={`${styles.viewModeButton} ${viewMode === 'list' ? styles.active : ''}`}
                                onClick={() => setViewMode('list')}
                                title="List view"
                            >
                                <ListIcon className={styles.viewModeIcon} />
                            </button>
                        </div>
                        <CustomSelect
                            value={sortBy}
                            options={[
                                { value: 'date-edited', label: 'Date Edited' },
                                { value: 'date-created', label: 'Date Created' },
                                { value: 'a-z', label: 'A–Z' },
                                { value: 'z-a', label: 'Z–A' },
                            ]}
                            onChange={(value) => setSortBy(value as SortOption)}
                        />
                    </div>
                </div>

                {renderSection('Recent Notes', recentNotes)}
                {renderSection('Starred', favoriteNotes)}
                {renderSection('Shared with Me', sortedSharedNotes)}
                {renderSection('All Notes', sortedNotes)}
            </div>
        </div>
    );
};
