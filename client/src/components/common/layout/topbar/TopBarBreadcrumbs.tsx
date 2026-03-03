import React from 'react';
import { useNavigate } from 'react-router-dom';
import { HomeIcon, ChevronRightIcon, UserIcon } from '@components/common/ui/icons';
import * as styles from '@components/common/layout/topbar/TopBar.module.css';

const cn = (...classes: (string | undefined | false)[]) => classes.filter(Boolean).join(' ');

interface TopBarBreadcrumbsProps {
    noteTitle?: string;
    noteOwnerId?: string;
    noteOwnerLogin?: string;
    noteOwnerName?: string;
}

export const TopBarBreadcrumbs: React.FC<TopBarBreadcrumbsProps> = ({
    noteTitle,
    noteOwnerId,
    noteOwnerLogin,
    noteOwnerName,
}) => {
    const navigate = useNavigate();

    return (
        <div className={styles.left}>
            {/* Home — icon only when a note is open, icon + text on home */}
            <button
                className={cn(
                    styles.button,
                    styles.buttonGhost,
                    styles.homeButton,
                    noteTitle && styles.homeButtonIconOnly,
                )}
                onClick={() => navigate('/')}
                title="Home"
            >
                <HomeIcon className={styles.homeIcon} />
                {!noteTitle && <span className={styles.homeText}>Home</span>}
            </button>

            {noteTitle && (
                <>
                    <ChevronRightIcon className={styles.breadcrumbChevron} />
                    <span className={cn(styles.breadcrumbItem, styles.breadcrumbItemActive)}>
                        {noteTitle}
                    </span>

                    {(noteOwnerLogin || noteOwnerId) && (
                        <>
                            <ChevronRightIcon className={styles.breadcrumbChevron} />
                            <button
                                className={styles.ownerLinkButton}
                                onClick={() => {
                                    const identifier = noteOwnerLogin || noteOwnerId;
                                    navigate(`/user/${identifier}`);
                                }}
                                title={`View ${noteOwnerName || noteOwnerLogin || 'owner'}'s profile`}
                            >
                                <UserIcon className={styles.ownerLinkIcon} />
                                <span className={styles.ownerLinkText}>
                                    {noteOwnerName || noteOwnerLogin || 'Owner'}
                                </span>
                            </button>
                        </>
                    )}
                </>
            )}
        </div>
    );
};
