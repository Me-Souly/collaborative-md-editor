import React from 'react';
import { observer } from 'mobx-react-lite';
import { useNavigate } from 'react-router-dom';
import { SunIcon, MoonIcon, SettingsIcon } from '@components/common/ui/icons';
import { useSettingsStore, useAuthStore } from '@hooks/useStores';
import * as styles from '@components/sidebar/FileSidebar.module.css';

const cn = (...classes: (string | undefined | false)[]) => classes.filter(Boolean).join(' ');

export const FileSidebarFooter: React.FC = observer(() => {
    const settingsStore = useSettingsStore();
    const authStore = useAuthStore();
    const navigate = useNavigate();
    const isDark = settingsStore.theme === 'dark';

    const user = authStore.user;
    const displayName = user?.name || user?.login || 'User';
    const initial = displayName.charAt(0).toUpperCase() || '?';
    return (
        <div className={styles.footer}>
            {/* Avatar + name — click goes to profile */}
            <button
                className={styles.footerProfile}
                onClick={() => navigate('/profile')}
                title="Go to profile"
            >
                <div className={styles.footerAvatar}>{initial}</div>
                <span className={styles.footerUsername}>{displayName}</span>
            </button>

            {/* Settings — opens profile preferences tab */}
            <button
                className={cn(styles.button, styles.buttonGhost, styles.footerIconButton)}
                onClick={() => navigate('/profile?tab=preferences')}
                title="Preferences"
            >
                <SettingsIcon className={styles.icon} />
            </button>

            {/* Theme toggle */}
            <button
                className={cn(styles.button, styles.buttonGhost, styles.footerIconButton)}
                onClick={() => settingsStore.toggleTheme()}
                title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            >
                {isDark ? (
                    <SunIcon className={styles.icon} />
                ) : (
                    <MoonIcon className={styles.icon} />
                )}
            </button>
        </div>
    );
});
