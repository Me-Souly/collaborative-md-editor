import React, { useState, useEffect, useCallback, useRef } from 'react';
import { observer } from 'mobx-react-lite';
import { XIcon, MessageSquareIcon, SparklesIcon, ArrowRightIcon } from '@components/common/ui/icons';
import * as styles from '@components/notes/NoteViewer.module.css';
import { useAuthStore } from '@hooks/useStores';
import { CommentService, Comment } from '@service/CommentService';
import { InlineCommentService, InlineComment } from '@service/InlineCommentService';
import { CommentItem } from './CommentItem';
import { InlineCommentItem } from './InlineCommentItem';

type RightPanelTab = 'comments' | 'ai';
type CommentsSubTab = 'inline' | 'general';

interface PendingAnchor {
    yjsAnchor: string;
    anchorText: string;
}

interface EditorRightPanelProps {
    tab: RightPanelTab | null;
    noteId: string;
    onClose: () => void;
    onTabChange: (tab: RightPanelTab) => void;
    pendingAnchor: PendingAnchor | null;
    onClearAnchor: () => void;
    onScrollToAnchor: (yjsAnchor: string, anchorText?: string | null) => void;
}

export const EditorRightPanel: React.FC<EditorRightPanelProps> = observer(({
    tab,
    noteId,
    onClose,
    onTabChange,
    pendingAnchor,
    onClearAnchor,
    onScrollToAnchor,
}) => {
    useAuthStore();

    const [subTab, setSubTab] = useState<CommentsSubTab>('inline');
    const [commentText, setCommentText] = useState('');
    const [sending, setSending] = useState(false);
    const inputRef = useRef<HTMLTextAreaElement>(null);

    const [inlineComments, setInlineComments] = useState<InlineComment[]>([]);
    const [postComments, setPostComments]      = useState<Comment[]>([]);
    const [loading, setLoading]                = useState(false);

    const fetchComments = useCallback(async () => {
        if (!noteId) return;
        setLoading(true);
        try {
            const [inlineRes, postRes] = await Promise.all([
                InlineCommentService.getByNote(noteId),
                CommentService.getByNote(noteId),
            ]);
            setInlineComments(inlineRes.data);
            setPostComments(postRes.data);
        } catch {
            // ignore, panel will show empty state
        } finally {
            setLoading(false);
        }
    }, [noteId]);

    useEffect(() => {
        if (tab === 'comments') {
            fetchComments();
        }
    }, [tab, fetchComments]);

    // Когда появляется новый pending anchor — переключиться на Inline таб
    useEffect(() => {
        if (pendingAnchor) setSubTab('inline');
    }, [pendingAnchor]);

    // Autofocus input when panel opens or pending anchor arrives
    useEffect(() => {
        if (tab === 'comments') {
            setTimeout(() => inputRef.current?.focus(), 50);
        }
    }, [tab, pendingAnchor]);

    const handleSubmit = async () => {
        const text = commentText.trim();
        if (!text || sending) return;
        setSending(true);
        try {
            if (pendingAnchor) {
                // Inline comment
                const res = await InlineCommentService.create(noteId, {
                    content: text,
                    yjsAnchor: pendingAnchor.yjsAnchor,
                    anchorText: pendingAnchor.anchorText,
                });
                setInlineComments(prev => [...prev, res.data]);
                onClearAnchor();
            } else {
                // Post-level comment
                const res = await CommentService.create(noteId, text);
                setPostComments(prev => [...prev, res.data]);
                setSubTab('general');
            }
            setCommentText('');
        } catch {
            // keep text, let user retry
        } finally {
            setSending(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit();
        }
        // Shift+Enter — default textarea behaviour (newline) — no override needed
    };

    // ── Inline comment handlers ─────────────────────────────────────
    const handleInlineDelete = async (id: string) => {
        await InlineCommentService.delete(id);
        setInlineComments(prev => prev.filter(c => c.id !== id));
    };

    const handleInlineReact = async (id: string, type: string) => {
        const res = await InlineCommentService.react(id, type);
        setInlineComments(prev => prev.map(c => c.id === id ? res.data : c));
    };

    const handleInlineResolve = async (id: string) => {
        const res = await InlineCommentService.resolve(id);
        setInlineComments(prev => prev.map(c => c.id === id ? res.data : c));
    };

    // ── Post-level comment handlers ─────────────────────────────────
    const handlePostDelete = async (id: string) => {
        await CommentService.delete(id);
        setPostComments(prev => prev.filter(c => c.id !== id));
    };

    const handlePostReact = async (id: string, type: string) => {
        const res = await CommentService.react(id, type);
        setPostComments(prev => prev.map(c => c.id === id ? res.data : c));
    };

    const activeInline  = inlineComments.filter(c => !c.isResolved);
    const resolvedCount = inlineComments.filter(c => c.isResolved).length;

    const inputPlaceholder = pendingAnchor
        ? `Комментарий к «${pendingAnchor.anchorText.slice(0, 30)}${pendingAnchor.anchorText.length > 30 ? '…' : ''}»`
        : 'Добавить комментарий…';

    return (
        <div
            className={styles.rightPanel}
            style={{ width: tab ? 280 : 0 }}
            aria-hidden={!tab}
        >
            {tab && (
                <div className={styles.rightPanelInner}>
                    {/* Header */}
                    <div className={styles.rightPanelHeader}>
                        <div className={styles.rightPanelTabs}>
                            <button
                                className={`${styles.rightPanelTab} ${tab === 'comments' ? styles.rightPanelTabActive : ''}`}
                                onClick={() => onTabChange('comments')}
                            >
                                Comments
                            </button>
                            <button
                                className={`${styles.rightPanelTab} ${tab === 'ai' ? styles.rightPanelTabActive : ''}`}
                                onClick={() => onTabChange('ai')}
                            >
                                AI
                            </button>
                        </div>
                        <button className={styles.rightPanelClose} onClick={onClose} title="Закрыть">
                            <XIcon className={styles.toolbarIcon} />
                        </button>
                    </div>

                    {/* Comments tab */}
                    {tab === 'comments' && (
                        <div className={styles.rightPanelContent}>
                            {/* Sub-tabs: Inline / General */}
                            <div className={styles.rightPanelSubTabs}>
                                <button
                                    className={`${styles.rightPanelSubTab} ${subTab === 'inline' ? styles.rightPanelSubTabActive : ''}`}
                                    onClick={() => setSubTab('inline')}
                                >
                                    Inline {activeInline.length > 0 && <span className={styles.badge}>{activeInline.length}</span>}
                                </button>
                                <button
                                    className={`${styles.rightPanelSubTab} ${subTab === 'general' ? styles.rightPanelSubTabActive : ''}`}
                                    onClick={() => setSubTab('general')}
                                >
                                    General {postComments.length > 0 && <span className={styles.badge}>{postComments.length}</span>}
                                </button>
                            </div>

                            {/* Pending anchor indicator */}
                            {pendingAnchor && (
                                <div className={styles.pendingAnchorBar}>
                                    <span>● «{pendingAnchor.anchorText.slice(0, 40)}»</span>
                                    <button onClick={onClearAnchor} title="Отменить" className={styles.clearAnchorBtn}>
                                        <XIcon />
                                    </button>
                                </div>
                            )}

                            {/* Comment list */}
                            <div className={styles.commentList}>
                                {loading && (
                                    <div className={styles.rightPanelEmpty}>
                                        <p className={styles.rightPanelEmptyHint}>Загрузка…</p>
                                    </div>
                                )}

                                {!loading && subTab === 'inline' && activeInline.length === 0 && (
                                    <div className={styles.rightPanelEmpty}>
                                        <MessageSquareIcon className={styles.rightPanelEmptyIcon} />
                                        <p className={styles.rightPanelEmptyTitle}>Нет inline-комментариев</p>
                                        <p className={styles.rightPanelEmptyHint}>
                                            Выделите текст в редакторе и нажмите «Комментарий»
                                        </p>
                                    </div>
                                )}

                                {!loading && subTab === 'general' && postComments.length === 0 && (
                                    <div className={styles.rightPanelEmpty}>
                                        <MessageSquareIcon className={styles.rightPanelEmptyIcon} />
                                        <p className={styles.rightPanelEmptyTitle}>Нет комментариев</p>
                                        <p className={styles.rightPanelEmptyHint}>Напишите первый</p>
                                    </div>
                                )}

                                {!loading && subTab === 'inline' && activeInline.map(c => (
                                    <InlineCommentItem
                                        key={c.id}
                                        comment={c}
                                        onDelete={handleInlineDelete}
                                        onReact={handleInlineReact}
                                        onResolve={handleInlineResolve}
                                        onAnchorClick={(anchor) => onScrollToAnchor(anchor, c.anchorText)}
                                    />
                                ))}

                                {!loading && subTab === 'general' && postComments.map(c => (
                                    <CommentItem
                                        key={c.id}
                                        comment={c}
                                        onDelete={handlePostDelete}
                                        onReact={handlePostReact}
                                    />
                                ))}

                                {!loading && subTab === 'inline' && resolvedCount > 0 && (
                                    <p className={styles.resolvedHint}>
                                        {resolvedCount} решённых — скрыты
                                    </p>
                                )}
                            </div>

                            {/* Input row */}
                            <div className={styles.rightPanelInputRow}>
                                <textarea
                                    ref={inputRef}
                                    className={styles.rightPanelInput}
                                    placeholder={inputPlaceholder}
                                    value={commentText}
                                    onChange={e => setCommentText(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    disabled={sending}
                                    rows={3}
                                />
                                <button
                                    className={styles.rightPanelSend}
                                    title="Отправить (Enter)"
                                    disabled={!commentText.trim() || sending}
                                    onClick={handleSubmit}
                                >
                                    <ArrowRightIcon className={styles.toolbarIcon} />
                                </button>
                            </div>
                        </div>
                    )}

                    {/* AI tab */}
                    {tab === 'ai' && (
                        <div className={styles.rightPanelContent}>
                            <div className={styles.rightPanelEmpty}>
                                <SparklesIcon className={styles.rightPanelEmptyIcon} />
                                <p className={styles.rightPanelEmptyTitle}>AI Assistant</p>
                                <p className={styles.rightPanelEmptyHint}>Coming soon</p>
                            </div>
                            <div className={styles.rightPanelAiFeatures}>
                                {['Summarize note', 'Fix grammar', 'Translate', 'Ask about content'].map((f) => (
                                    <div key={f} className={styles.rightPanelAiFeature}>
                                        <span className={styles.rightPanelAiDot}>•</span> {f}
                                    </div>
                                ))}
                            </div>
                            <div className={styles.rightPanelInputRow}>
                                <input
                                    className={styles.rightPanelInput}
                                    placeholder="Coming soon..."
                                    disabled
                                    style={{ opacity: 0.5, cursor: 'not-allowed' }}
                                />
                                <button className={styles.rightPanelSend} disabled style={{ opacity: 0.4 }}>
                                    <ArrowRightIcon className={styles.toolbarIcon} />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
});
