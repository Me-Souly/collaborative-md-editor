import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_URL } from '@http';
import * as styles from '@pages/LandingPage.module.css';

interface PublicNote {
    id: string;
    title: string;
    meta?: {
        excerpt?: string;
    };
    ownerName?: string;
    ownerId?: string;
    updatedAt?: string;
}

export const LandingPage: React.FC = () => {
    const navigate = useNavigate();
    const [notes, setNotes] = useState<PublicNote[]>([]);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);
    const notesRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const loadPublicNotes = async () => {
            try {
                const res = await fetch(`${API_URL}/notes/public`);
                if (res.ok) {
                    const data = await res.json();
                    setNotes(Array.isArray(data) ? data : []);
                }
            } catch {
                // Не критично
            } finally {
                setLoading(false);
            }
        };
        loadPublicNotes();
    }, []);

    const filtered = search.trim()
        ? notes.filter(
              (n) =>
                  n.title?.toLowerCase().includes(search.toLowerCase()) ||
                  n.meta?.excerpt?.toLowerCase().includes(search.toLowerCase()),
          )
        : notes;

    const formatDate = (dateStr?: string) => {
        if (!dateStr) return '';
        const d = new Date(dateStr);
        return d.toLocaleDateString('ru-RU', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
        });
    };

    const scrollToNotes = () => {
        notesRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    return (
        <div className={styles.landing}>
            {/* Header */}
            <header className={styles.header}>
                <div className={styles.logo}>
                    <div className={styles.logoIcon}>N</div>
                    <span className={styles.logoText}>Note Editor</span>
                </div>
                <div className={styles.headerActions}>
                    <button className={styles.loginBtn} onClick={() => navigate('/login')}>
                        Войти
                    </button>
                    <button className={styles.registerBtn} onClick={() => navigate('/login')}>
                        Регистрация
                    </button>
                </div>
            </header>

            {/* Hero */}
            <section className={styles.hero}>
                <h1 className={styles.heroTitle}>Совместные заметки в реальном времени</h1>
                <p className={styles.heroDescription}>
                    Создавайте, редактируйте и делитесь заметками с поддержкой Markdown. Работайте
                    вместе с коллегами – изменения синхронизируются мгновенно.
                </p>
                <div className={styles.heroActions}>
                    <button className={styles.ctaBtn} onClick={() => navigate('/login')}>
                        Начать бесплатно
                    </button>
                    {notes.length > 0 && (
                        <button className={styles.secondaryBtn} onClick={scrollToNotes}>
                            Публичные заметки
                        </button>
                    )}
                </div>
            </section>

            {/* Features */}
            <div className={styles.features}>
                <div className={styles.featureCard}>
                    <div className={styles.featureIcon}>&#9998;</div>
                    <h3 className={styles.featureTitle}>Markdown-редактор</h3>
                    <p className={styles.featureDescription}>
                        Полноценный редактор с поддержкой Markdown-синтаксиса, подсветкой и
                        предпросмотром.
                    </p>
                </div>
                <div className={styles.featureCard}>
                    <div className={styles.featureIcon}>&#8644;</div>
                    <h3 className={styles.featureTitle}>Совместная работа</h3>
                    <p className={styles.featureDescription}>
                        Реальное время: несколько пользователей редактируют один документ без
                        конфликтов.
                    </p>
                </div>
                <div className={styles.featureCard}>
                    <div className={styles.featureIcon}>&#128274;</div>
                    <h3 className={styles.featureTitle}>Гибкий доступ</h3>
                    <p className={styles.featureDescription}>
                        Делитесь заметками по ссылке, управляйте правами чтения и редактирования.
                    </p>
                </div>
            </div>

            {/* Public notes */}
            <section className={styles.publicSection} ref={notesRef}>
                <div className={styles.sectionHeader}>
                    <h2 className={styles.sectionTitle}>Публичные заметки</h2>
                    {notes.length > 0 && (
                        <input
                            className={styles.searchInput}
                            type="text"
                            placeholder="Поиск по заметкам..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    )}
                </div>

                {loading ? (
                    <div className={styles.loadingNotes}>Загрузка...</div>
                ) : filtered.length === 0 ? (
                    <div className={styles.emptyNotes}>
                        {search ? 'Ничего не найдено' : 'Пока нет публичных заметок'}
                    </div>
                ) : (
                    <div className={styles.notesGrid}>
                        {filtered.map((note) => (
                            <a
                                key={note.id}
                                className={styles.noteCard}
                                href={`/note/${note.id}`}
                                onClick={(e) => {
                                    e.preventDefault();
                                    navigate(`/note/${note.id}`);
                                }}
                            >
                                <h3 className={styles.noteTitle}>{note.title || 'Без названия'}</h3>
                                {note.meta?.excerpt && (
                                    <p className={styles.noteExcerpt}>{note.meta.excerpt}</p>
                                )}
                                <div className={styles.noteMeta}>
                                    {note.ownerName && (
                                        <span className={styles.noteAuthor}>{note.ownerName}</span>
                                    )}
                                    {formatDate(note.updatedAt)}
                                </div>
                            </a>
                        ))}
                    </div>
                )}
            </section>
        </div>
    );
};
