import React, { useState } from 'react';
import { LoginForm } from '@components/auth/LoginForm';
import { RegisterForm } from '@components/auth/RegisterForm';
import * as styles from '@components/auth/Auth.module.css';

type AuthView = 'login' | 'register';

export const Auth: React.FC = () => {
    const [view, setView] = useState<AuthView>('login');

    return (
        <div className={styles.container}>
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
};
