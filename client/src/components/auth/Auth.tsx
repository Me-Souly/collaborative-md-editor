import React, { useState } from 'react';
import { observer } from 'mobx-react-lite';
import { LoginForm } from '@components/auth/LoginForm';
import { RegisterForm } from '@components/auth/RegisterForm';
import { SunIcon, MoonIcon } from '@components/common/ui/icons';
import { useSettingsStore } from '@hooks/useStores';
import * as styles from '@components/auth/Auth.module.css';

type AuthView = 'login' | 'register';

export const Auth: React.FC = observer(() => {
    const [view, setView] = useState<AuthView>('login');
    const settingsStore = useSettingsStore();

    return (
        <div className={styles.container}>
            <button
                className={styles.themeToggle}
                onClick={() => settingsStore.toggleTheme()}
                title={settingsStore.theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
            >
                {settingsStore.theme === 'light'
                    ? <MoonIcon className={styles.themeToggleIcon} />
                    : <SunIcon className={styles.themeToggleIcon} />
                }
            </button>
            <div className={styles.wrapper}>
                {view === 'login' ? (
                    <LoginForm
                        onSwitchToRegister={() => setView('register')}
                        onForgotPassword={() => {}}
                    />
                ) : (
                    <RegisterForm onSwitchToLogin={() => setView('login')} />
                )}
            </div>
        </div>
    );
});
