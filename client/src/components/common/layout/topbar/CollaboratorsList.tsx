import React from 'react';
import { useNavigate } from 'react-router-dom';
import { getCollaboratorInitials } from '@components/common/layout/topbar/utils';
import * as styles from '@components/common/layout/topbar/TopBar.module.css';

const cn = (...classes: (string | undefined | false)[]) => classes.filter(Boolean).join(' ');

interface Collaborator {
    id: string;
    name: string;
    avatar?: string;
    initials?: string;
    login?: string;
    username?: string;
    email?: string;
    isOnline?: boolean;
}

interface CollaboratorsListProps {
    collaborators: Collaborator[];
    maxVisible?: number;
}

export const CollaboratorsList: React.FC<CollaboratorsListProps> = ({
    collaborators,
    maxVisible = 2,
}) => {
    const navigate = useNavigate();

    if (collaborators.length === 0) return null;

    return (
        <div className={styles.collaborators}>
            {collaborators.slice(0, maxVisible).map((collab, index) => (
                <button
                    key={collab.id}
                    type="button"
                    className={styles.avatarWrapperButton}
                    style={{ marginLeft: index > 0 ? '-8px' : '0' }}
                    title={collab.name}
                    onClick={(e) => {
                        e.stopPropagation();
                        const identifier = collab.login || collab.username || collab.id;
                        navigate(`/user/${identifier}`);
                    }}
                >
                    <div className={styles.avatarWrapper}>
                        <div className={cn(styles.avatar, styles.avatarStacked)}>
                            {collab.avatar ? (
                                <img src={collab.avatar} alt={collab.name} />
                            ) : (
                                <span className={styles.avatarFallback}>
                                    {getCollaboratorInitials(collab)}
                                </span>
                            )}
                        </div>
                        <span
                            className={cn(
                                styles.presenceDot,
                                collab.isOnline ? styles.presenceOnline : styles.presenceOffline,
                            )}
                        />
                    </div>
                </button>
            ))}
        </div>
    );
};
