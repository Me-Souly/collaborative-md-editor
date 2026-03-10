import React, { useState } from 'react';
import { useToastContext } from '@contexts/ToastContext';
import { useLinkSharing, type ShareLink } from '@components/modals/hooks/useLinkSharing';
import { CopyIcon, TrashIcon, GlobeIcon, LockIcon } from '@components/common/ui/icons';
import * as styles from '@components/modals/ShareModal.module.css';
import * as linkStyles from '@components/modals/LinkSharing.module.css';

const cn = (...classes: (string | undefined | false)[]) => classes.filter(Boolean).join(' ');

const EXPIRY_PRESETS = [
    { label: 'Никогда', value: null },
    { label: '1 день', value: 1 },
    { label: '7 дней', value: 7 },
    { label: '30 дней', value: 30 },
];

function formatExpiry(expiresAt: string | null): string {
    if (!expiresAt) return 'Бессрочно';
    const date = new Date(expiresAt);
    const now = new Date();
    if (date < now) return 'Истекла';
    const diffMs = date.getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays === 1) return 'Истекает сегодня';
    return `Истекает через ${diffDays} д.`;
}

interface LinkItemProps {
    link: ShareLink;
    onDelete: (token: string) => void;
    loading: boolean;
}

const LinkItem: React.FC<LinkItemProps> = ({ link, onDelete, loading }) => {
    const toast = useToastContext();

    const copyLink = () => {
        navigator.clipboard.writeText(link.shareLink);
        toast.success('Ссылка скопирована');
    };

    return (
        <div className={linkStyles.linkItem}>
            <div className={linkStyles.linkItemMeta}>
                {link.name && <span className={linkStyles.linkName}>{link.name}</span>}
                <div className={linkStyles.linkItemBadges}>
                    <span className={cn(linkStyles.permBadge, link.permission === 'edit' && linkStyles.permBadgeEdit)}>
                        {link.permission === 'edit' ? 'Редактирование' : 'Просмотр'}
                    </span>
                    <span className={linkStyles.expiryText}>{formatExpiry(link.expiresAt)}</span>
                </div>
            </div>
            <div className={linkStyles.linkItemRow}>
                <input
                    type="text"
                    className={cn(styles.input, linkStyles.linkInput)}
                    value={link.shareLink}
                    readOnly
                />
                <button
                    className={linkStyles.iconBtn}
                    onClick={copyLink}
                    title="Скопировать"
                >
                    <CopyIcon className={linkStyles.iconBtnIcon} />
                </button>
                <button
                    className={cn(linkStyles.iconBtn, linkStyles.iconBtnDanger)}
                    onClick={() => onDelete(link.token)}
                    disabled={loading}
                    title="Отозвать"
                >
                    <TrashIcon className={linkStyles.iconBtnIcon} />
                </button>
            </div>
        </div>
    );
};

interface LinkSharingProps {
    noteId: string;
    open: boolean;
}

export const LinkSharing: React.FC<LinkSharingProps> = ({ noteId, open }) => {
    const { links, loading, createLink, deleteLink } = useLinkSharing(noteId, open);
    const [permission, setPermission] = useState<'read' | 'edit'>('read');
    const [expiryDays, setExpiryDays] = useState<number | null>(null);
    const [linkName, setLinkName] = useState('');
    const [creating, setCreating] = useState(false);

    const handleCreate = async () => {
        setCreating(true);
        const expiresAt = expiryDays !== null
            ? new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000)
            : null;
        const result = await createLink(permission, expiresAt, linkName.trim());
        if (result) setLinkName('');
        setCreating(false);
    };

    return (
        <div className={cn(styles.section, styles.linkSection)}>
            <div className={styles.linkHeader}>
                <div>
                    <label className={styles.label}>Доступ по ссылке</label>
                    <p className={styles.description}>Ссылку можно отозвать в любой момент</p>
                </div>
            </div>

            <div className={linkStyles.createRow}>
                {/* Название ссылки */}
                <input
                    type="text"
                    className={cn(styles.input, linkStyles.nameInput)}
                    placeholder="Название ссылки (необязательно)"
                    value={linkName}
                    onChange={e => setLinkName(e.target.value)}
                    maxLength={60}
                />

                {/* Toggler: Просмотр / Редактирование — на всю ширину */}
                <div className={linkStyles.permToggle}>
                    <button
                        className={cn(linkStyles.permBtn, permission === 'read' && linkStyles.permBtnActive)}
                        onClick={() => setPermission('read')}
                    >
                        <LockIcon className={linkStyles.permBtnIcon} />
                        Просмотр
                    </button>
                    <button
                        className={cn(linkStyles.permBtn, permission === 'edit' && linkStyles.permBtnActive)}
                        onClick={() => setPermission('edit')}
                    >
                        <GlobeIcon className={linkStyles.permBtnIcon} />
                        Редактирование
                    </button>
                </div>

                {/* Срок действия с лейблом */}
                <div className={linkStyles.expiryGroup}>
                    <span className={linkStyles.expiryLabel}>Срок действия</span>
                    <div className={linkStyles.expiryPresets}>
                        {EXPIRY_PRESETS.map(p => (
                            <button
                                key={String(p.value)}
                                className={cn(linkStyles.expiryBtn, expiryDays === p.value && linkStyles.expiryBtnActive)}
                                onClick={() => setExpiryDays(p.value)}
                            >
                                {p.label}
                            </button>
                        ))}
                    </div>
                </div>

                <button
                    className={cn(styles.button, styles.buttonPrimary, linkStyles.createBtn)}
                    onClick={handleCreate}
                    disabled={loading || creating}
                >
                    Создать ссылку
                </button>
            </div>

            {/* Список активных ссылок */}
            {links.length > 0 && (
                <div className={linkStyles.linkList}>
                    {links.map(link => (
                        <LinkItem
                            key={link.token}
                            link={link}
                            onDelete={deleteLink}
                            loading={loading}
                        />
                    ))}
                </div>
            )}

            {links.length === 0 && (
                <p className={linkStyles.emptyText}>Нет активных ссылок</p>
            )}
        </div>
    );
};
