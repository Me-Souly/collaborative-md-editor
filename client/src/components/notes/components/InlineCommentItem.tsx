import React from 'react';
import { TrashIcon, CheckIcon } from '@components/common/ui/icons';
import { InlineComment } from '@service/InlineCommentService';
import * as styles from './InlineCommentItem.module.css';

const cx = (...classes: (string | undefined | false)[]) => classes.filter(Boolean).join(' ');

const REACTIONS = [
    { type: 'like',  emoji: '👍' },
    { type: 'heart', emoji: '❤️' },
    { type: 'laugh', emoji: '😂' },
    { type: 'sad',   emoji: '😢' },
    { type: 'angry', emoji: '😡' },
];

function getInitials(username: string): string {
    return username ? username.slice(0, 2).toUpperCase() : '?';
}

function relativeTime(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1)  return 'только что';
    if (mins < 60) return `${mins} мин назад`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24)  return `${hrs} ч назад`;
    return `${Math.floor(hrs / 24)} дн назад`;
}

interface Props {
    comment: InlineComment;
    onDelete: (id: string) => void;
    onReact: (id: string, type: string) => void;
    onResolve: (id: string) => void;
    /** Клик по чипу anchor → прокрутить редактор к этой позиции */
    onAnchorClick: (yjsAnchor: string) => void;
}

export const InlineCommentItem: React.FC<Props> = ({
    comment,
    onDelete,
    onReact,
    onResolve,
    onAnchorClick,
}) => {
    const totalReactions = Object.values(comment.reactions).reduce((s, n) => s + n, 0);

    return (
        <div className={cx(styles.item, comment.isResolved && styles.resolved)}>
            {/* Anchor chip — показывает выделенный текст, клик → scroll to position */}
            {comment.anchorText && (
                <button
                    className={styles.anchorChip}
                    onClick={() => onAnchorClick(comment.yjsAnchor)}
                    title="Перейти к месту в тексте"
                >
                    <span className={styles.anchorDot}>●</span>
                    <span className={styles.anchorText}>«{comment.anchorText}»</span>
                </button>
            )}

            <div className={styles.header}>
                <div className={styles.avatar}>
                    {comment.author.avatar
                        ? <img src={comment.author.avatar} alt={comment.author.username} />
                        : getInitials(comment.author.username ?? '')}
                </div>
                <div className={styles.meta}>
                    <div className={styles.author}>{comment.author.username ?? 'Аноним'}</div>
                    <div className={styles.time}>{relativeTime(comment.createdAt)}</div>
                </div>
                <div className={styles.actions}>
                    {comment.canResolve && !comment.isResolved && !comment.isDeleted && (
                        <button
                            className={cx(styles.actionBtn, styles.resolveBtn)}
                            title="Отметить как решённый"
                            onClick={() => onResolve(comment.id)}
                        >
                            <CheckIcon />
                        </button>
                    )}
                    {comment.canDelete && !comment.isDeleted && (
                        <button
                            className={cx(styles.actionBtn, styles.deleteBtn)}
                            title="Удалить"
                            onClick={() => onDelete(comment.id)}
                        >
                            <TrashIcon />
                        </button>
                    )}
                </div>
            </div>

            <div className={cx(styles.content, comment.isDeleted && styles.deleted)}>
                {comment.content}
            </div>

            {!comment.isDeleted && !comment.isResolved && (
                <div className={styles.reactions}>
                    {REACTIONS.map(({ type, emoji }) => {
                        const count = comment.reactions[type] ?? 0;
                        const active = comment.myReaction === type;
                        if (count === 0 && !active) return null;
                        return (
                            <button
                                key={type}
                                className={cx(styles.reactionBtn, active && styles.reactionBtnActive)}
                                onClick={() => onReact(comment.id, type)}
                                title={type}
                            >
                                {emoji}
                                {count > 0 && <span className={styles.reactionCount}>{count}</span>}
                            </button>
                        );
                    })}
                    {totalReactions === 0 && (
                        REACTIONS.slice(0, 3).map(({ type, emoji }) => (
                            <button
                                key={type}
                                className={styles.reactionBtn}
                                onClick={() => onReact(comment.id, type)}
                                title={type}
                            >
                                {emoji}
                            </button>
                        ))
                    )}
                </div>
            )}
        </div>
    );
};
