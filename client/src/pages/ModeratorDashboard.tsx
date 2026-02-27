import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@hooks/useStores';
import ModeratorService from '@service/ModeratorService';
import type { PublicNoteForModerator } from '@models/response/ModeratorResponse';
import { Modal } from '@components/common/ui/Modal';
import { FileTextIcon, SearchIcon } from '@components/common/ui/icons';
import { Loader } from '@components/common/ui';
import { ModeratorNoteRow } from '@pages/components/ModeratorNoteRow';
import * as styles from '@pages/ModeratorDashboard.module.css';

const ITEMS_PER_PAGE = 10;

// Начальные ширины столбцов: ID, Название, Автор, Превью, Дата, Действия
const INITIAL_WIDTHS = [70, 200, 150, 280, 110, 100];

const useResizableColumns = (initial: number[]) => {
    const [widths, setWidths] = useState(initial);
    const colRefs = useRef<(HTMLTableColElement | null)[]>([]);

    const onMouseDown = useCallback(
        (col: number) => (e: React.MouseEvent) => {
            e.preventDefault();
            const startX = e.clientX;
            const startW =
                colRefs.current[col]?.getBoundingClientRect().width ?? INITIAL_WIDTHS[col];

            document.body.style.cursor = 'col-resize';
            document.body.style.userSelect = 'none';

            const move = (ev: MouseEvent) => {
                const next = Math.max(60, startW + ev.clientX - startX);
                // Обновляем DOM напрямую — без перерендера React
                const colEl = colRefs.current[col];
                if (colEl) colEl.style.width = `${next}px`;
            };

            const up = (ev: MouseEvent) => {
                const next = Math.max(60, startW + ev.clientX - startX);
                document.body.style.cursor = '';
                document.body.style.userSelect = '';
                // Фиксируем в state только при отпускании
                setWidths((prev) => prev.map((w, i) => (i === col ? next : w)));
                window.removeEventListener('mousemove', move);
                window.removeEventListener('mouseup', up);
            };

            window.addEventListener('mousemove', move);
            window.addEventListener('mouseup', up);
        },
        [],
    );

    return { widths, colRefs, onMouseDown };
};

export const ModeratorDashboard: React.FC = () => {
    const navigate = useNavigate();
    const authStore = useAuthStore();
    const [notes, setNotes] = useState<PublicNoteForModerator[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [noteToDelete, setNoteToDelete] = useState<PublicNoteForModerator | null>(null);
    const { widths, colRefs, onMouseDown } = useResizableColumns(INITIAL_WIDTHS);

    useEffect(() => {
        if (!authStore.isAuth || authStore.user.role !== 'moderator') {
            navigate('/');
            return;
        }

        const loadNotes = async () => {
            try {
                setLoading(true);
                const response = await ModeratorService.getPublicNotes();
                setNotes(response.data);
            } catch (error) {
                console.error('Failed to load public notes:', error);
            } finally {
                setLoading(false);
            }
        };

        loadNotes();
    }, [authStore.isAuth, authStore.user.role, navigate]);

    const filteredNotes = useMemo(() => {
        if (!searchQuery.trim()) return notes;
        const query = searchQuery.toLowerCase();
        return notes.filter(
            (note) =>
                note.title.toLowerCase().includes(query) ||
                note.author?.name.toLowerCase().includes(query) ||
                note.author?.login.toLowerCase().includes(query),
        );
    }, [notes, searchQuery]);

    const totalPages = Math.ceil(filteredNotes.length / ITEMS_PER_PAGE);
    const paginatedNotes = filteredNotes.slice(
        (currentPage - 1) * ITEMS_PER_PAGE,
        currentPage * ITEMS_PER_PAGE,
    );

    const handleDeleteClick = (note: PublicNoteForModerator) => {
        setNoteToDelete(note);
        setDeleteModalOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (noteToDelete) {
            try {
                await ModeratorService.deleteNote(noteToDelete.id);
                setNotes((prev) => prev.filter((n) => n.id !== noteToDelete.id));
                setDeleteModalOpen(false);
                setNoteToDelete(null);
                if (paginatedNotes.length === 1 && currentPage > 1) {
                    setCurrentPage((prev) => prev - 1);
                }
            } catch (error) {
                console.error('Failed to delete note:', error);
            }
        }
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('ru-RU', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
        });
    };

    if (loading) {
        return <Loader fullScreen variant="spinner" size="lg" text="Загрузка..." />;
    }

    const headers = ['ID', 'Название', 'Автор', 'Превью', 'Дата'];

    return (
        <div className={styles.container}>
            {/* Sidebar */}
            <aside className={styles.sidebar}>
                <div className={styles.sidebarHeader}>
                    <h1 className={styles.sidebarTitle}>Панель Модератора</h1>
                    <p className={styles.sidebarSubtitle}>Moderator Dashboard</p>
                </div>
                <nav className={styles.nav}>
                    <Link to="/moderator" className={styles.navItemActive}>
                        <FileTextIcon className={styles.navIcon} />
                        <span>Обзор Публичных Заметок</span>
                    </Link>
                </nav>
                <div className={styles.sidebarFooter}>
                    <Link to="/" className={styles.backLink}>
                        ← Вернуться на главную
                    </Link>
                </div>
            </aside>

            {/* Main Content */}
            <main className={styles.main}>
                <div className={styles.content}>
                    <div className={styles.header}>
                        <h2 className={styles.title}>Public Notes Review</h2>
                        <p className={styles.subtitle}>
                            Просмотр и модерация всех публичных заметок пользователей
                        </p>
                    </div>

                    {/* Search */}
                    <div className={styles.searchContainer}>
                        <div className={styles.searchWrapper}>
                            <SearchIcon className={styles.searchIcon} />
                            <input
                                type="text"
                                placeholder="Поиск по названию или автору..."
                                value={searchQuery}
                                onChange={(e) => {
                                    setSearchQuery(e.target.value);
                                    setCurrentPage(1);
                                }}
                                className={styles.searchInput}
                            />
                        </div>
                    </div>

                    {/* Table */}
                    <div className={styles.tableContainer}>
                        <table className={styles.table}>
                            <colgroup>
                                {widths.map((w, i) => (
                                    <col
                                        key={i}
                                        ref={(el) => {
                                            colRefs.current[i] = el;
                                        }}
                                        style={{ width: w }}
                                    />
                                ))}
                            </colgroup>
                            <thead>
                                <tr className={styles.tableHeaderRow}>
                                    {headers.map((label, i) => (
                                        <th key={label} className={styles.tableHeader}>
                                            <span>{label}</span>
                                            <div
                                                className={styles.resizeHandle}
                                                onMouseDown={onMouseDown(i)}
                                            />
                                        </th>
                                    ))}
                                    <th className={styles.tableHeaderActions}>Действия</th>
                                </tr>
                            </thead>
                            <tbody>
                                {paginatedNotes.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className={styles.emptyCell}>
                                            {searchQuery
                                                ? 'Заметки не найдены'
                                                : 'Нет публичных заметок'}
                                        </td>
                                    </tr>
                                ) : (
                                    paginatedNotes.map((note) => (
                                        <ModeratorNoteRow
                                            key={note.id}
                                            note={note}
                                            onDelete={handleDeleteClick}
                                            formatDate={formatDate}
                                        />
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className={styles.pagination}>
                            <p className={styles.paginationInfo}>
                                Показано {(currentPage - 1) * ITEMS_PER_PAGE + 1}–
                                {Math.min(currentPage * ITEMS_PER_PAGE, filteredNotes.length)} из{' '}
                                {filteredNotes.length} заметок
                            </p>
                            <div className={styles.paginationControls}>
                                <button
                                    onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                                    disabled={currentPage === 1}
                                    className={styles.paginationButton}
                                >
                                    ← Назад
                                </button>
                                <span className={styles.paginationPage}>
                                    Страница {currentPage} из {totalPages}
                                </span>
                                <button
                                    onClick={() =>
                                        setCurrentPage((prev) => Math.min(totalPages, prev + 1))
                                    }
                                    disabled={currentPage === totalPages}
                                    className={styles.paginationButton}
                                >
                                    Далее →
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </main>

            {/* Delete Confirmation Modal */}
            <Modal
                isOpen={deleteModalOpen}
                onClose={() => setDeleteModalOpen(false)}
                title="Удалить публичную заметку?"
                message={`Вы уверены, что хотите удалить заметку "${noteToDelete?.title}"?\n\nЭто действие необратимо.`}
                confirmText="Удалить"
                cancelText="Отмена"
                onConfirm={handleConfirmDelete}
                variant="danger"
            />
        </div>
    );
};
