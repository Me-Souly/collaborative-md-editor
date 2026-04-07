import React from 'react';
import { TrashIcon } from '@components/common/ui/icons';
import { Comment } from '@service/CommentService';
import * as styles from './CommentItem.module.css';

const cx = (...classes: (string | undefined | false)[]) => classes.filter(Boolean).join(' ');

const REACTIONS = [
    { type: 'like',    emoji: '👍' },
    { type: 'dislike', emoji: '👎' },
    { type: 'heart',   emoji: '❤️' },
    { type: 'laugh',   emoji: '😂' },
    { type: 'sad',     emoji: '😢' },
    { type: 'angry',   emoji: '😡' },
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
    const days = Math.floor(hrs / 24);
    return `${days} дн назад`;
}

interface Props {
    comment: Comment;
    onDelete: (id: string) => void;
    onReact: (id: string, type: string) => void;
}

export const CommentItem: React.FC<Props> = ({ comment, onDelete, onReact }) => {
    const totalReactions = Object.values(comment.reactions).reduce((s, n) => s + n, 0);

    return (
        <div className={styles.item}>
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
                {comment.canDelete && !comment.isDeleted && (
                    <button
                        className={styles.deleteBtn}
                        title="Удалить"
                        onClick={() => onDelete(comment.id)}
                    >
                        <TrashIcon />
                    </button>
                )}
            </div>

            <div className={cx(styles.content, comment.isDeleted && styles.deleted)}>
                {comment.content}
                {comment.isEdited && !comment.isDeleted && (
                    <span className={styles.edited}>(изм.)</span>
                )}
            </div>

            {!comment.isDeleted && (
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
                    {/* Кнопки для добавления реакций если ещё нет */}
                    {totalReactions === 0 && (
                        REACTIONS.slice(0, 4).map(({ type, emoji }) => (
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
