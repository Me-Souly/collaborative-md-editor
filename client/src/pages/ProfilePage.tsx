import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { observer } from 'mobx-react-lite';
import { useAuthStore, useSettingsStore } from '@hooks/useStores';
import { useToastContext } from '@contexts/ToastContext';
import { ArrowLeftIcon, CheckIcon } from '@components/common/ui/icons';
import type { Accent, Theme } from '@stores/settingsStore';
import * as styles from '@pages/ProfilePage.module.css';
import $api from '@http';

type TabKey = 'profile' | 'security' | 'preferences';

const normalizeRole = (raw: unknown): string => {
    if (!raw) return 'User';
    const v = String(raw).toLowerCase();
    if (v === 'user') return 'User';
    if (v === 'admin' || v === 'administrator') return 'Admin';
    if (v === 'moderator' || v === 'mod') return 'Moderator';
    if (/^[0-9a-f]{24}$/i.test(v)) return 'User';
    return v.charAt(0).toUpperCase() + v.slice(1);
};

const ACCENTS: { key: Accent; color: string; label: string }[] = [
    { key: 'amber', color: '#d97706', label: 'Amber' },
    { key: 'indigo', color: '#6366f1', label: 'Indigo' },
    { key: 'slate', color: '#4a7fa5', label: 'Slate' },
    { key: 'forest', color: '#5a8a5a', label: 'Forest' },
    { key: 'rose', color: '#d4677a', label: 'Rose' },
];

// ── Field helper ──────────────────────────────────────────────────────────────
const Field: React.FC<{ label: string; helpText?: string; children: React.ReactNode }> = ({
    label,
    helpText,
    children,
}) => (
    <div className={styles.field}>
        <label className={styles.fieldLabel}>{label}</label>
        {children}
        {helpText && <p className={styles.helpText}>{helpText}</p>}
    </div>
);

// ── PrefRow helper ────────────────────────────────────────────────────────────
const PrefRow: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
    <div className={styles.prefRow}>
        <span className={styles.prefLabel}>{label}</span>
        {children}
    </div>
);

// ── Main page ─────────────────────────────────────────────────────────────────
export const ProfilePage: React.FC = observer(() => {
    const navigate = useNavigate();
    const authStore = useAuthStore();
    const settingsStore = useSettingsStore();
    const toast = useToastContext();
    const [searchParams] = useSearchParams();

    const initialTab = (['profile', 'security', 'preferences'] as TabKey[]).includes(
        searchParams.get('tab') as TabKey,
    )
        ? (searchParams.get('tab') as TabKey)
        : 'profile';

    const [tab, setTab] = useState<TabKey>(initialTab);
    const [saved, setSaved] = useState(false);

    const baseUser: any = authStore.user || {};
    const [profile, setProfile] = useState({
        name: baseUser.name || baseUser.username || 'User',
        login: baseUser.login || baseUser.username || '',
        email: baseUser.email || '',
        bio: baseUser.about || '',
        role: normalizeRole(baseUser.role),
    });

    const [passwords, setPasswords] = useState({ current: '', next: '', confirm: '' });

    const [stats, setStats] = useState({ totalNotes: 0, sharedNotes: 0 });

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

    useEffect(() => {
        $api.get('/notes')
            .then((res) => {
                const data = Array.isArray(res.data) ? res.data : [];
                const shared = data.filter((n: any) => n.isPublic || n.access?.length > 0).length;
                setStats({ totalNotes: data.length, sharedNotes: shared });
            })
            .catch(() => {});
    }, []);

    const initials =
        profile.name
            .split(' ')
            .map((n: string) => n[0])
            .join('')
            .toUpperCase()
            .slice(0, 2) || 'U';

    const handleSaveProfile = async () => {
        try {
            const res = await $api.patch('/users/me', {
                name: profile.name,
                login: profile.login,
                about: profile.bio,
            });
            authStore.setUser(res.data);
            setSaved(true);
            setTimeout(() => setSaved(false), 2000);
            toast.success('Profile updated');
        } catch (e: any) {
            toast.error(e?.response?.data?.message || 'Failed to update profile');
        }
    };

    const handleChangePassword = async () => {
        if (!passwords.current || !passwords.next || !passwords.confirm) {
            toast.warning('Fill in all password fields');
            return;
        }
        if (passwords.next !== passwords.confirm) {
            toast.warning('Passwords do not match');
            return;
        }
        try {
            await authStore.changePassword(passwords.current, passwords.next);
            toast.success('Password updated');
            setPasswords({ current: '', next: '', confirm: '' });
        } catch {}
    };

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <div className={styles.page}>
            {/* Topbar */}
            <header className={styles.topbar}>
                <button className={styles.topbarBack} onClick={() => navigate('/')}>
                    <ArrowLeftIcon className={styles.topbarBackIcon} />
                    Profile Settings
                </button>
            </header>

            <div className={styles.content}>
                {/* User header */}
                <div className={styles.userHeader}>
                    <div className={styles.avatar}>{initials}</div>
                    <div className={styles.userInfo}>
                        <div className={styles.userNameRow}>
                            <h1 className={styles.userName}>{profile.name}</h1>
                            {authStore.user?.isActivated ? (
                                <span className={styles.badgeActive}>Activated</span>
                            ) : (
                                <span className={styles.badgeInactive}>Not Activated</span>
                            )}
                        </div>
                        <p className={styles.userMeta}>
                            @{profile.login || profile.email} &middot; Notes: {stats.totalNotes} &middot; Shared:{' '}
                            {stats.sharedNotes}
                        </p>
                    </div>
                </div>

                {/* Tabs */}
                <div className={styles.tabs}>
                    {(['profile', 'security', 'preferences'] as TabKey[]).map((t) => (
                        <button
                            key={t}
                            className={`${styles.tab} ${tab === t ? styles.tabActive : ''}`}
                            onClick={() => setTab(t)}
                        >
                            {t.charAt(0).toUpperCase() + t.slice(1)}
                        </button>
                    ))}
                </div>

                {/* Tab content */}
                <div className={styles.tabContent}>
                    {tab === 'profile' && (
                        <div className={styles.fields}>
                            <Field label="Full Name">
                                <input
                                    className={styles.input}
                                    value={profile.name}
                                    onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                                />
                            </Field>
                            <Field label="Login">
                                <input
                                    className={styles.input}
                                    value={profile.login}
                                    onChange={(e) => setProfile({ ...profile, login: e.target.value })}
                                    placeholder="Your username"
                                />
                            </Field>
                            <Field label="Email" helpText="Email cannot be changed">
                                <input
                                    className={styles.input}
                                    type="email"
                                    value={profile.email}
                                    disabled
                                />
                            </Field>
                            <Field label="Bio">
                                <textarea
                                    className={styles.textarea}
                                    rows={3}
                                    value={profile.bio}
                                    onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                                    placeholder="A few words about yourself"
                                />
                            </Field>
                        </div>
                    )}

                    {tab === 'security' && (
                        <div className={styles.fields}>
                            <div className={styles.card}>
                                <h3 className={styles.cardTitle}>Change Password</h3>
                                <div className={styles.cardBody}>
                                    <input
                                        className={styles.input}
                                        type="password"
                                        placeholder="Current password"
                                        value={passwords.current}
                                        onChange={(e) =>
                                            setPasswords({ ...passwords, current: e.target.value })
                                        }
                                    />
                                    <input
                                        className={styles.input}
                                        type="password"
                                        placeholder="New password"
                                        value={passwords.next}
                                        onChange={(e) =>
                                            setPasswords({ ...passwords, next: e.target.value })
                                        }
                                    />
                                    <input
                                        className={styles.input}
                                        type="password"
                                        placeholder="Confirm new password"
                                        value={passwords.confirm}
                                        onChange={(e) =>
                                            setPasswords({ ...passwords, confirm: e.target.value })
                                        }
                                    />
                                    <button className={styles.btnPrimary} onClick={handleChangePassword}>
                                        Update password
                                    </button>
                                </div>
                            </div>
                            <div className={styles.card}>
                                <div className={styles.cardRow}>
                                    <div>
                                        <h3 className={styles.cardTitle}>Two-Factor Authentication</h3>
                                        <p className={styles.helpText}>Coming soon</p>
                                    </div>
                                    <span className={styles.badgeSoon}>Soon</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {tab === 'preferences' && (
                        <div className={styles.prefList}>
                            <PrefRow label="Theme">
                                <div className={styles.btnGroup}>
                                    {(['light', 'dark'] as Theme[]).map((t) => (
                                        <button
                                            key={t}
                                            className={`${styles.groupBtn} ${settingsStore.theme === t ? styles.groupBtnActive : ''}`}
                                            onClick={() => settingsStore.setTheme(t)}
                                        >
                                            {t.charAt(0).toUpperCase() + t.slice(1)}
                                        </button>
                                    ))}
                                </div>
                            </PrefRow>

                            <PrefRow label="Accent Color">
                                <div className={styles.accentDots}>
                                    {ACCENTS.map((a) => (
                                        <button
                                            key={a.key}
                                            className={styles.accentDot}
                                            title={a.label}
                                            style={{
                                                background: a.color,
                                                outline:
                                                    settingsStore.accent === a.key
                                                        ? `2px solid ${a.color}`
                                                        : 'none',
                                                outlineOffset: 2,
                                            }}
                                            onClick={() => settingsStore.setAccent(a.key)}
                                        >
                                            {settingsStore.accent === a.key && (
                                                <CheckIcon className={styles.accentCheck} />
                                            )}
                                        </button>
                                    ))}
                                </div>
                            </PrefRow>

                            <PrefRow label="Card View">
                                <div className={styles.btnGroup}>
                                    {(['grid', 'list'] as const).map((v) => (
                                        <button
                                            key={v}
                                            className={`${styles.groupBtn} ${settingsStore.cardView === v ? styles.groupBtnActive : ''}`}
                                            onClick={() => settingsStore.setCardView(v)}
                                        >
                                            {v.charAt(0).toUpperCase() + v.slice(1)}
                                        </button>
                                    ))}
                                </div>
                            </PrefRow>
                        </div>
                    )}
                </div>

                {/* Actions */}
                <div className={styles.actions}>
                    <button className={styles.btnSecondary} onClick={() => navigate('/')}>
                        Cancel
                    </button>
                    {tab !== 'preferences' && (
                        <button className={styles.btnPrimary} onClick={handleSaveProfile}>
                            {saved && <CheckIcon className={styles.saveIcon} />}
                            {saved ? 'Saved!' : 'Save changes'}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
});
