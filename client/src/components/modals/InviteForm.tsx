import React, { useState } from 'react';
import { useToastContext } from '@contexts/ToastContext';
import { MailIcon } from '@components/common/ui/icons';
import { CustomSelect } from '@components/common/ui/CustomSelect';
import { useUserSearch } from '@components/modals/hooks/useUserSearch';
import type { User } from '@components/modals/hooks/useShareModal';
import { getInitials } from '@components/modals/utils';
import * as styles from '@components/modals/ShareModal.module.css';

const cn = (...classes: (string | undefined | false)[]) => classes.filter(Boolean).join(' ');

interface InviteFormProps {
    users: User[];
    loading: boolean;
    onInvite: (userId: string, permission: 'read' | 'edit') => Promise<boolean>;
}

export const InviteForm: React.FC<InviteFormProps> = ({ users, loading, onInvite }) => {
    const toast = useToastContext();
    const [inviteEmail, setInviteEmail] = useState('');
    const [invitePermission, setInvitePermission] = useState<'read' | 'edit'>('edit');

    const { filteredUsers } = useUserSearch(users, inviteEmail);

    const handleInvite = async () => {
        if (!inviteEmail.trim()) {
            toast.warning('Введите email или имя пользователя');
            return;
        }

        if (filteredUsers.length === 0) {
            toast.error('Пользователь не найден');
            return;
        }

        if (filteredUsers.length > 1) {
            toast.warning('Найдено несколько пользователей. Уточните запрос.');
            return;
        }

        const userToInvite = filteredUsers[0];
        const userId = userToInvite.id;

        if (!userId) {
            toast.error('Не удалось определить ID пользователя');
            console.error('User to invite:', userToInvite);
            return;
        }

        const success = await onInvite(userId, invitePermission);

        if (success) {
            toast.success(`Доступ предоставлен ${userToInvite.name || userToInvite.email}`);
            setInviteEmail('');
        }
    };

    return (
        <div className={styles.section}>
            <label className={styles.label}>Пригласить по email</label>
            <div className={styles.inviteRow}>
                <div className={styles.inputWrapper}>
                    <MailIcon className={styles.inputIcon} />
                    <input
                        type="text"
                        className={styles.input}
                        placeholder="Введите email или имя"
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                handleInvite();
                            }
                        }}
                    />
                    {inviteEmail && filteredUsers.length > 0 && (
                        <div className={styles.userSuggestions}>
                            {filteredUsers.slice(0, 5).map((user) => (
                                <button
                                    key={user.id}
                                    className={styles.userSuggestion}
                                    onClick={() => {
                                        setInviteEmail(user.email || user.name || '');
                                    }}
                                >
                                    <div className={styles.userSuggestionAvatar}>
                                        {getInitials(user.name || user.email || 'U')}
                                    </div>
                                    <div className={styles.userSuggestionInfo}>
                                        <div className={styles.userSuggestionName}>{user.name}</div>
                                        <div className={styles.userSuggestionEmail}>
                                            {user.email}
                                        </div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
                <CustomSelect
                    value={invitePermission}
                    options={[
                        { value: 'read', label: 'View' },
                        { value: 'edit', label: 'Edit' },
                    ]}
                    onChange={(value) => setInvitePermission(value as 'read' | 'edit')}
                />
                <button
                    className={cn(styles.button, styles.buttonPrimary)}
                    onClick={handleInvite}
                    disabled={loading || !inviteEmail.trim()}
                >
                    Пригласить
                </button>
            </div>
        </div>
    );
};
