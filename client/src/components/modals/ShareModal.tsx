import React from 'react';
import { XIcon } from '@components/common/ui/icons';
import { useShareModal } from '@components/modals/hooks/useShareModal';
import { InviteForm } from '@components/modals/InviteForm';
import { CollaboratorList } from '@components/modals/CollaboratorList';
import { LinkSharing } from '@components/modals/LinkSharing';
import * as styles from '@components/modals/ShareModal.module.css';

const cn = (...classes: (string | undefined | false)[]) => classes.filter(Boolean).join(' ');

interface ShareModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    noteId: string;
    noteTitle: string;
}

export const ShareModal: React.FC<ShareModalProps> = ({
    open,
    onOpenChange,
    noteId,
    noteTitle,
}) => {
    const {
        collaborators,
        users,
        loading,
        handleInvite,
        handleRemoveCollaborator,
        handleUpdatePermission,
    } = useShareModal(noteId, open);

    if (!open) return null;

    return (
        <div className={styles.overlay} onClick={() => onOpenChange(false)}>
            <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                <div className={styles.modalHeader}>
                    <h2 className={styles.modalTitle}>Share "{noteTitle}"</h2>
                    <button className={styles.closeButton} onClick={() => onOpenChange(false)}>
                        <XIcon className={styles.closeIcon} />
                    </button>
                </div>

                <div className={styles.modalBody}>
                    <InviteForm users={users} loading={loading} onInvite={handleInvite} />

                    <CollaboratorList
                        collaborators={collaborators}
                        loading={loading}
                        onUpdatePermission={handleUpdatePermission}
                        onRemove={handleRemoveCollaborator}
                    />

                    <LinkSharing noteId={noteId} />
                </div>

                <div className={styles.modalFooter}>
                    <button
                        className={cn(styles.button, styles.buttonOutline)}
                        onClick={() => onOpenChange(false)}
                    >
                        Закрыть
                    </button>
                    <button
                        className={cn(styles.button, styles.buttonPrimary)}
                        onClick={() => onOpenChange(false)}
                    >
                        Готово
                    </button>
                </div>
            </div>
        </div>
    );
};
