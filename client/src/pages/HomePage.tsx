import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { NoteCard } from '@components/notes/NoteCard';
import { CustomSelect } from '@components/common/ui/CustomSelect';
import { Loader } from '@components/common/ui';
import { FileTextIcon, GridIcon, ListIcon, PlusIcon } from '@components/common/ui/icons';
import $api from '@http';
import * as styles from '@pages/HomePage.module.css';

type ViewMode = 'grid' | 'list';
type SortOption = 'date-edited' | 'date-created' | 'a-z' | 'z-a';

interface NoteTag {
    id: string;
    name: string;
    slug: string;
}

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
    folderId?: string | null;
    tags: NoteTag[];
}

interface Folder {
    id: string;
    name: string;
    parentId?: string | null;
}

function getFolderPath(folderId: string | null | undefined, folders: Folder[]): string {
    if (!folderId) return '';
    const folder = folders.find((f) => f.id === folderId);
    if (!folder) return '';
    const parent = getFolderPath(folder.parentId, folders);
    return parent ? `${parent} › ${folder.name}` : folder.name;
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
        folderId: n.folderId ?? null,
        tags: Array.isArray(n.tags) ? n.tags : [],
    };
};

export const HomePage: React.FC = () => {
    const navigate = useNavigate();
    const [notes, setNotes] = useState<HomeNote[]>([]);
    const [sharedNotes, setSharedNotes] = useState<HomeNote[]>([]);
    const [folders, setFolders] = useState<Folder[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isOffline, setIsOffline] = useState(false);
    const [viewMode, setViewMode] = useState<ViewMode>('grid');
    const [sortBy, setSortBy] = useState<SortOption>('date-edited');
    const [creating, setCreating] = useState(false);
    const [activeTagFilters, setActiveTagFilters] = useState<string[]>([]);

    const toggleTagFilter = (tagName: string) => {
        setActiveTagFilters((prev) =>
            prev.includes(tagName) ? prev.filter((t) => t !== tagName) : [...prev, tagName],
        );
    };
    const clearTagFilters = () => setActiveTagFilters([]);

    useEffect(() => {
        const loadNotes = async () => {
            try {
                setLoading(true);
                const [ownNotesRes, sharedNotesRes, foldersRes] = await Promise.all([
                    $api.get('/notes'),
                    $api.get('/notes/shared').catch(() => ({ data: [] })),
                    $api.get('/folders').catch(() => ({ data: [] })),
                ]);

                const ownData = Array.isArray(ownNotesRes.data) ? ownNotesRes.data : [];
                const sharedData = Array.isArray(sharedNotesRes.data) ? sharedNotesRes.data : [];
                const foldersData = Array.isArray(foldersRes.data) ? foldersRes.data : [];

                const mappedOwn = ownData.map(mapNote);
                const mappedShared = sharedData.map(mapNote);

                setNotes(mappedOwn);
                setSharedNotes(mappedShared);
                setFolders(foldersData.map((f: any) => ({ id: f.id, name: f.name, parentId: f.parentId ?? null })));
                setIsOffline(false);
                setError(null);

                try {
                    localStorage.setItem(
                        HOME_NOTES_CACHE_KEY,
                        JSON.stringify({ notes: mappedOwn, sharedNotes: mappedShared }),
                    );
                } catch { /* ignore */ }
            } catch (e: any) {
                if (!e?.response) {
                    try {
                        const cached = localStorage.getItem(HOME_NOTES_CACHE_KEY);
                        if (cached) {
                            const { notes: cn, sharedNotes: cs } = JSON.parse(cached);
                            setNotes(cn || []);
                            setSharedNotes(cs || []);
                            setIsOffline(true);
                            setError(null);
                        } else {
                            setError('No server connection');
                        }
                    } catch {
                        setError('No server connection');
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
            switch (sortBy) {
                case 'date-edited':
                    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
                case 'date-created':
                    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
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

    const sortedSharedNotes = useMemo(() => {
        const copy = [...sharedNotes];
        copy.sort((a, b) => {
            switch (sortBy) {
                case 'date-edited':
                    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
                case 'date-created':
                    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
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

    const filterByTags = (items: HomeNote[]) => {
        if (activeTagFilters.length === 0) return items;
        return items.filter((n) =>
            activeTagFilters.every((tag) => n.tags.some((t) => t.name === tag)),
        );
    };

    const filteredNotes = filterByTags(sortedNotes);
    const filteredSharedNotes = filterByTags(sortedSharedNotes);

    const recentNotes = filteredNotes.slice(0, 3);
    const favoriteNotes = filteredNotes.filter((n) => n.isFavorite);
    const showRecent = filteredNotes.length > 3;

    const handleDeleteNote = (noteId: string) => {
        setNotes((prev) => prev.filter((n) => n.id !== noteId));
    };

    const handleCreateNote = async () => {
        if (creating) return;
        try {
            setCreating(true);
            const res = await $api.post('/notes', { title: 'Untitled' });
            const noteId = res.data?.id || res.data?._id;
            if (noteId) navigate(`/note/${noteId}`, { state: { isNew: true } });
        } catch {
            /* ignore */
        } finally {
            setCreating(false);
        }
    };

    const handleTagsChange = (noteId: string, newTags: NoteTag[]) => {
        setNotes((prev) => prev.map((n) => (n.id === noteId ? { ...n, tags: newTags } : n)));
        setSharedNotes((prev) => prev.map((n) => (n.id === noteId ? { ...n, tags: newTags } : n)));
    };

    const renderNoteGrid = (items: HomeNote[], startIndex = 0, showNewNote = false) => (
        <div className={viewMode === 'grid' ? styles.grid : styles.list}>
            {items.map((note, i) => (
                <NoteCard
                    key={note.id}
                    note={note}
                    viewMode={viewMode}
                    staggerIndex={startIndex + i}
                    folderPath={getFolderPath(note.folderId, folders)}
                    onDelete={() => handleDeleteNote(note.id)}
                    onTagClick={toggleTagFilter}
                    onTagsChange={(tags) => handleTagsChange(note.id, tags)}
                />
            ))}
            {showNewNote && (
                viewMode === 'grid' ? (
                    <button
                        className={styles.newNoteCard}
                        onClick={handleCreateNote}
                        disabled={creating}
                        title="Create new note"
                    >
                        <PlusIcon className={styles.newNoteIcon} />
                        <span>New Note</span>
                    </button>
                ) : (
                    <button
                        className={styles.newNoteRow}
                        onClick={handleCreateNote}
                        disabled={creating}
                    >
                        <PlusIcon className={styles.newNoteRowIcon} />
                        <span>New Note</span>
                    </button>
                )
            )}
        </div>
    );

    if (loading) {
        return <Loader fullScreen variant="spinner" size="lg" text="Loading notes..." />;
    }

    if (error) {
        return (
            <div className={styles.emptyState}>
                <p className={styles.emptyText}>{error}</p>
            </div>
        );
    }

    if (!notes.length && !sharedNotes.length) {
        return (
            <div className={styles.homePage}>
                <div className={styles.homeInner}>
                    <div className={styles.emptyState}>
                        <FileTextIcon className={styles.emptyIcon} />
                        <p className={styles.emptyTitle}>No notes yet</p>
                        <p className={styles.emptyText}>Create your first note to get started</p>
                        <button
                            className={styles.emptyButton}
                            onClick={handleCreateNote}
                            disabled={creating}
                        >
                            <PlusIcon className={styles.emptyButtonIcon} />
                            Create a note
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.homePage}>
            <div className={styles.homeInner}>
                <div className={styles.homeHeader}>
                    <h1 className={styles.homeTitle}>
                        Your Notes
                        {isOffline && <span className={styles.offlineBadge}>offline</span>}
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

                {/* Tag filter bar */}
                {activeTagFilters.length > 0 && (
                    <div className={styles.tagFilterBar}>
                        <span className={styles.tagFilterLabel}>Filtered by:</span>
                        {activeTagFilters.map((tag) => (
                            <button
                                key={tag}
                                className={styles.tagFilterChip}
                                onClick={() => toggleTagFilter(tag)}
                            >
                                #{tag}
                                <span className={styles.tagFilterChipX}>&times;</span>
                            </button>
                        ))}
                        <button className={styles.tagFilterClear} onClick={clearTagFilters}>
                            Clear all
                        </button>
                    </div>
                )}

                {/* Recent — only when there are more than 3 notes */}
                {showRecent && (
                    <section className={styles.section}>
                        <h2 className={styles.sectionTitle}>Recent</h2>
                        {renderNoteGrid(recentNotes, 0, true)}
                    </section>
                )}

                {/* Starred */}
                {favoriteNotes.length > 0 && (
                    <section className={styles.section}>
                        <h2 className={styles.sectionTitle}>Starred</h2>
                        {renderNoteGrid(favoriteNotes)}
                    </section>
                )}

                {/* Shared with me */}
                {filteredSharedNotes.length > 0 && (
                    <section className={styles.section}>
                        <h2 className={styles.sectionTitle}>Shared with Me</h2>
                        {renderNoteGrid(filteredSharedNotes)}
                    </section>
                )}

                {/* All Notes */}
                <section className={styles.section}>
                    <h2 className={styles.sectionTitle}>All Notes</h2>
                    {renderNoteGrid(filteredNotes, 0, !showRecent)}
                </section>
            </div>
        </div>
    );
};
