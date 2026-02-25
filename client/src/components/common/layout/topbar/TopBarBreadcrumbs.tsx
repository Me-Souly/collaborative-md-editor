import React from 'react';
import { useNavigate } from 'react-router-dom';
import { HomeIcon, GlobeIcon, UserIcon } from '@components/common/ui/icons';
import * as styles from '@components/common/layout/topbar/TopBar.module.css';

const cn = (...classes: (string | undefined | false)[]) => classes.filter(Boolean).join(' ');

interface TopBarBreadcrumbsProps {
    noteTitle?: string;
    isPublic?: boolean;
    noteOwnerId?: string;
    noteOwnerLogin?: string;
    noteOwnerName?: string;
}

export const TopBarBreadcrumbs: React.FC<TopBarBreadcrumbsProps> = ({
    noteTitle,
    isPublic = false,
    noteOwnerId,
    noteOwnerLogin,
    noteOwnerName,
}) => {
    const navigate = useNavigate();

    return (
        <div className={styles.left}>
            <button
                className={cn(styles.button, styles.buttonGhost, styles.homeButton)}
                onClick={() => navigate('/')}
            >
                <HomeIcon className={styles.homeIcon} />
                <span className={styles.homeText}>Home</span>
            </button>
            {noteTitle && (
                <>
                    <span className={styles.breadcrumbSeparator}>/</span>
                    <span className={cn(styles.breadcrumbItem, styles.breadcrumbItemActive)}>
                        {noteTitle}
                    </span>
                    {isPublic && (
                        <>
                            <span className={styles.breadcrumbSeparator}>•</span>
                            <span className={styles.publicBadge} title="Public note">
                                <GlobeIcon className={styles.publicIcon} />
                                <span className={styles.publicText}>Public</span>
                            </span>
                        </>
                    )}
                    {(noteOwnerLogin || noteOwnerId) && (
                        <>
                            <span className={styles.breadcrumbSeparator}>•</span>
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
