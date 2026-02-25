import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@hooks/useStores';
import { useToastContext } from '@contexts/ToastContext';
import * as styles from '@pages/ProfilePage.module.css';
import $api from '@http';

type TabKey = 'profile' | 'security' | 'preferences';

const normalizeRole = (raw: unknown): string => {
    if (!raw) return 'User';
    const v = String(raw).toLowerCase();
    if (v === 'user') return 'User';
    if (v === 'admin' || v === 'administrator') return 'Admin';
    if (v === 'moderator' || v === 'mod') return 'Moderator';
    // Если это ObjectId роли (24-хекс символов) или что-то странное — показываем как обычного пользователя
    if (/^[0-9a-f]{24}$/i.test(v)) return 'User';
    return v.charAt(0).toUpperCase() + v.slice(1);
};

export const ProfilePage: React.FC = () => {
    const navigate = useNavigate();
    const authStore = useAuthStore();
    const toast = useToastContext();

    const [activeTab, setActiveTab] = useState<TabKey>('profile');

    const baseUser: any = authStore.user || {};
    const [profile, setProfile] = useState({
        name: baseUser.name || baseUser.username || 'User',
        login: baseUser.login || baseUser.username || '',
        email: baseUser.email || '',
        bio: baseUser.about || '',
        role: normalizeRole(baseUser.role),
    });

    const [preferences, setPreferences] = useState({
        editorTheme: 'light',
        fontSize: 'medium',
        autoSave: true,
    });

    const [passwords, setPasswords] = useState({
        current: '',
        next: '',
        confirm: '',
    });

    const [stats, setStats] = useState({
        totalNotes: 0,
        sharedNotes: 0,
    });

    // Обновляем профиль при изменении пользователя
    useEffect(() => {
        const u: any = authStore.user;
        if (!u) return;
        setProfile((prev) => ({
            ...prev,
            name: u.name || u.username || prev.name,
            login: u.login || u.username || prev.login,
            email: u.email || prev.email,
            bio: u.about ?? prev.bio,
            role: normalizeRole(u.role ?? prev.role),
        }));
    }, [authStore.user]);

    // Загружаем статистику заметок
    useEffect(() => {
        const loadStats = async () => {
            try {
                const res = await $api.get('/notes');
                const data = Array.isArray(res.data) ? res.data : [];
                const total = data.length;
                const shared = data.filter((n: any) => n.isPublic || n.access?.length > 0).length;
                setStats({ totalNotes: total, sharedNotes: shared });
            } catch (e) {
                // тихо игнорируем, если не удалось
                console.error('Failed to load notes stats for profile:', e);
            }
        };

        loadStats();
    }, []);

    const initials =
        profile.name
            .split(' ')
            .map((n: string) => n[0])
            .join('')
            .toUpperCase() || 'U';

    const handleSaveProfile = async () => {
        try {
            const payload: any = {
                name: profile.name,
                login: profile.login,
                about: profile.bio,
            };
            const res = await $api.patch('/users/me', payload);
            authStore.setUser(res.data);
            toast.success('Профиль обновлён');
        } catch (e: any) {
            console.error('Failed to update profile:', e);
            const errorMsg = e?.response?.data?.message || 'Не удалось обновить профиль';
            toast.error(errorMsg);
        }
    };

    const handleChangePassword = async () => {
        if (!passwords.current || !passwords.next || !passwords.confirm) {
            toast.warning('Заполните все поля пароля');
            return;
        }
        if (passwords.next !== passwords.confirm) {
            toast.warning('Пароли не совпадают');
            return;
        }
        try {
            await authStore.changePassword(passwords.current, passwords.next);
            toast.success('Пароль обновлён');
            setPasswords({ current: '', next: '', confirm: '' });
        } catch (e: any) {
            console.error('Password change error:', e);
            console.error('Error response:', e?.response);
            console.error('Error response data:', e?.response?.data);
            // Interceptor already shows toast for errors, so we don't need to show it again
            // But we can log it for debugging
        }
    };

    const renderProfileTab = () => (
        <div className={styles.card}>
            <div className={styles.cardHeader}>
                <h2 className={styles.cardTitle}>Personal Information</h2>
                <p className={styles.cardDescription}>Update your profile information</p>
            </div>
            <div className={styles.cardContent}>
                <div className={styles.fieldGroup}>
                    <label className={styles.label} htmlFor="name">
                        Full Name
                    </label>
                    <input
                        id="name"
                        className={styles.input}
                        value={profile.name}
                        onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                    />
                </div>
                <div className={styles.fieldGroup}>
                    <label className={styles.label} htmlFor="login">
                        Login
                    </label>
                    <input
                        id="login"
                        className={styles.input}
                        value={profile.login}
                        onChange={(e) => setProfile({ ...profile, login: e.target.value })}
                        placeholder="Enter your login"
                    />
                </div>
                <div className={styles.fieldGroup}>
                    <label className={styles.label} htmlFor="email">
                        Email
                    </label>
                    <input
                        id="email"
                        type="email"
                        className={styles.input}
                        value={profile.email}
                        onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                        disabled
                    />
                    <p className={styles.helpText}>Email cannot be changed</p>
                </div>
                <div className={styles.fieldGroup}>
                    <label className={styles.label} htmlFor="bio">
                        Bio
                    </label>
                    <textarea
                        id="bio"
                        className={styles.textarea}
                        rows={3}
                        value={profile.bio}
                        onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                    />
                </div>
            </div>
        </div>
    );

    const renderSecurityTab = () => (
        <div className={styles.card}>
            <div className={styles.cardHeader}>
                <h2 className={styles.cardTitle}>Security</h2>
                <p className={styles.cardDescription}>Change your account password</p>
            </div>
            <div className={styles.cardContent}>
                <div className={styles.fieldGroup}>
                    <label className={styles.label} htmlFor="currentPassword">
                        Current password
                    </label>
                    <input
                        id="currentPassword"
                        type="password"
                        className={styles.input}
                        value={passwords.current}
                        onChange={(e) => setPasswords({ ...passwords, current: e.target.value })}
                    />
                </div>
                <div className={styles.fieldGroup}>
                    <label className={styles.label} htmlFor="newPassword">
                        New password
                    </label>
                    <input
                        id="newPassword"
                        type="password"
                        className={styles.input}
                        value={passwords.next}
                        onChange={(e) => setPasswords({ ...passwords, next: e.target.value })}
                    />
                </div>
                <div className={styles.fieldGroup}>
                    <label className={styles.label} htmlFor="confirmPassword">
                        Confirm password
                    </label>
                    <input
                        id="confirmPassword"
                        type="password"
                        className={styles.input}
                        value={passwords.confirm}
                        onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })}
                    />
                </div>
                <button className={styles.primaryButton} onClick={handleChangePassword}>
                    Update password
                </button>
            </div>
        </div>
    );

    const renderPreferencesTab = () => (
        <div className={styles.card}>
            <div className={styles.cardHeader}>
                <h2 className={styles.cardTitle}>Preferences</h2>
                <p className={styles.cardDescription}>Customize your editing experience</p>
            </div>
            <div className={styles.cardContent}>
                <div className={styles.fieldRow}>
                    <div>
                        <label className={styles.label}>Auto-save</label>
                        <p className={styles.helpText}>Automatically save changes as you type</p>
                    </div>
                    <label className={styles.switch}>
                        <input
                            type="checkbox"
                            checked={preferences.autoSave}
                            onChange={(e) =>
                                setPreferences({ ...preferences, autoSave: e.target.checked })
                            }
                        />
                        <span className={styles.slider} />
                    </label>
                </div>
                <div className={styles.fieldGroup}>
                    <label className={styles.label}>Font size</label>
                    <select
                        className={styles.select}
                        value={preferences.fontSize}
                        onChange={(e) =>
                            setPreferences({ ...preferences, fontSize: e.target.value })
                        }
                    >
                        <option value="small">Small</option>
                        <option value="medium">Medium</option>
                        <option value="large">Large</option>
                    </select>
                </div>
            </div>
        </div>
    );

    return (
        <div className={styles.page}>
            <header className={styles.header}>
                <button className={styles.backButton} onClick={() => navigate('/')}>
                    ←
                </button>
                <h1 className={styles.headerTitle}>Profile Settings</h1>
            </header>

            <div className={styles.content}>
                <div className={styles.profileHeader}>
                    <div className={styles.avatarLarge}>
                        <span className={styles.avatarInitials}>{initials}</span>
                    </div>
                    <div className={styles.profileInfo}>
                        <div className={styles.profileNameRow}>
                            <h2 className={styles.profileName}>{profile.name}</h2>
                            {authStore.user?.isActivated ? (
                                <span className={styles.activationBadge}>Activated</span>
                            ) : (
                                <span className={styles.activationBadgeInactive}>
                                    Not Activated
                                </span>
                            )}
                        </div>
                        <p className={styles.profileRole}>{profile.role || 'No role set'}</p>
                        <div className={styles.profileStats}>
                            <span>Notes: {stats.totalNotes}</span>
                            <span>•</span>
                            <span>Shared: {stats.sharedNotes}</span>
                        </div>
                    </div>
                </div>

                <div className={styles.tabs}>
                    <button
                        className={`${styles.tab} ${activeTab === 'profile' ? styles.tabActive : ''}`}
                        onClick={() => setActiveTab('profile')}
                    >
                        Profile
                    </button>
                    <button
                        className={`${styles.tab} ${activeTab === 'security' ? styles.tabActive : ''}`}
                        onClick={() => setActiveTab('security')}
                    >
                        Security
                    </button>
                    <button
                        className={`${styles.tab} ${activeTab === 'preferences' ? styles.tabActive : ''}`}
                        onClick={() => setActiveTab('preferences')}
                    >
                        Preferences
                    </button>
                </div>

                <div className={styles.tabContent}>
                    {activeTab === 'profile' && renderProfileTab()}
                    {activeTab === 'security' && renderSecurityTab()}
                    {activeTab === 'preferences' && renderPreferencesTab()}
                </div>

                <div className={styles.actions}>
                    <button className={styles.secondaryButton} onClick={() => navigate('/')}>
                        Cancel
                    </button>
                    <button className={styles.primaryButton} onClick={handleSaveProfile}>
                        Save changes
                    </button>
                </div>
            </div>
        </div>
    );
};
