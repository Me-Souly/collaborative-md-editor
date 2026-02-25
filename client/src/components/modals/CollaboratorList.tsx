import React from 'react';
import { CustomSelect } from '@components/common/ui/CustomSelect';
import { XIcon } from '@components/common/ui/icons';
import type { Collaborator } from '@components/modals/hooks/useShareModal';
import { getInitials } from '@components/modals/utils';
import * as styles from '@components/modals/ShareModal.module.css';

interface CollaboratorListProps {
    collaborators: Collaborator[];
    loading: boolean;
    onUpdatePermission: (userId: string, permission: 'read' | 'edit') => void;
    onRemove: (userId: string) => void;
}

export const CollaboratorList: React.FC<CollaboratorListProps> = ({
    collaborators,
    loading,
    onUpdatePermission,
    onRemove,
}) => {
    return (
        <div className={styles.section}>
            <label className={styles.label}>Люди с доступом</label>
            <div className={styles.collaboratorsList}>
                {collaborators.map((collab) => (
                    <div key={collab.userId} className={styles.collaborator}>
                        <div className={styles.collaboratorAvatar}>{getInitials(collab.name)}</div>
                        <div className={styles.collaboratorInfo}>
                            <div className={styles.collaboratorName}>{collab.name}</div>
                            <div className={styles.collaboratorEmail}>
                                {collab.email || collab.userId}
                            </div>
                        </div>
                        <CustomSelect
                            value={collab.permission}
                            options={[
                                { value: 'read', label: 'View' },
                                { value: 'edit', label: 'Edit' },
                            ]}
                            onChange={(value) => {
                                if (!collab.isOwner) {
                                    onUpdatePermission(collab.userId, value as 'read' | 'edit');
                                }
                            }}
                        />
                        {!collab.isOwner && (
                            <button
                                className={styles.removeButton}
                                onClick={() => onRemove(collab.userId)}
                                disabled={loading}
                            >
                                <XIcon className={styles.removeIcon} />
                            </button>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};
