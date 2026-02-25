import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { observer } from 'mobx-react-lite';
import { useAuthStore } from '@hooks/useStores';
import { UserIcon } from '@components/common/ui/icons';
import { getUserInitials } from '@components/common/layout/topbar/utils';
import * as styles from '@components/common/layout/topbar/TopBar.module.css';

const cn = (...classes: (string | undefined | false)[]) => classes.filter(Boolean).join(' ');

export const UserMenu: React.FC = observer(() => {
    const navigate = useNavigate();
    const authStore = useAuthStore();
    const [showUserMenu, setShowUserMenu] = useState(false);
    const userMenuRef = useRef<HTMLDivElement>(null);

    // Закрытие меню при клике вне его
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
                setShowUserMenu(false);
            }
        };

        if (showUserMenu) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showUserMenu]);

    const handleSignOut = () => {
        authStore.logout();
        navigate('/');
    };

    const userDisplayName = authStore.user
        ? authStore.user.name ||
          authStore.user.login ||
          authStore.user.username ||
          authStore.user.email
        : 'User';

    return (
        <div className={styles.userMenu} ref={userMenuRef}>
            <button
                className={cn(styles.button, styles.buttonGhost, styles.userButton)}
                onClick={() => setShowUserMenu(!showUserMenu)}
                title={userDisplayName}
            >
                <div className={styles.avatar}>
                    {authStore.user?.avatarUrl ? (
                        <img src={authStore.user.avatarUrl} alt={userDisplayName} />
                    ) : (
                        <span className={cn(styles.avatarFallback, styles.avatarFallbackPrimary)}>
                            {authStore.user ? (
                                getUserInitials(authStore.user)
                            ) : (
                                <UserIcon className={styles.iconSmall} />
                            )}
                        </span>
                    )}
                </div>
            </button>

            {showUserMenu && (
                <div className={styles.dropdownMenu}>
                    <button
                        className={styles.dropdownItem}
                        onClick={() => {
                            setShowUserMenu(false);
                            navigate('/profile');
                        }}
                    >
                        <UserIcon className={styles.iconSmall} />
                        <span>Profile</span>
                    </button>
                    {/* <button
            className={styles.dropdownItem}
            onClick={() => {
              setShowUserMenu(false);
              navigate('/settings');
            }}
          >
            <UsersIcon className={styles.iconSmall} />
            <span>Settings</span>
          </button> */}
                    <div className={styles.dropdownSeparator} />
                    <button
                        className={cn(styles.dropdownItem, styles.dropdownItemDanger)}
                        onClick={handleSignOut}
                    >
                        <span>Sign Out</span>
                    </button>
                </div>
            )}
        </div>
    );
});
