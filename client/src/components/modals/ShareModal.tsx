import React, { useState } from 'react';
import { XIcon } from '@components/common/ui/icons';
import { useShareModal } from '@components/modals/hooks/useShareModal';
import { observer } from 'mobx-react-lite';
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
    onAccessChanged?: () => void;
}

export const ShareModal: React.FC<ShareModalProps> = observer(({
    open,
    onOpenChange,
    noteId,
    noteTitle,
    onAccessChanged,
}) => {
    const {
        collaborators,
        users,
        subnoteIds,
        loading,
        handleInvite,
        handleRemoveCollaborator,
        handleUpdatePermission,
    } = useShareModal(noteId, open, onAccessChanged);

    const [includeSubnotes, setIncludeSubnotes] = useState(false);

    const cascadeIds = includeSubnotes ? subnoteIds : [];

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
                    <InviteForm
                        users={users}
                        loading={loading}
                        onInvite={(userId, permission) => handleInvite(userId, permission, cascadeIds)}
                    />

                    {subnoteIds.length > 0 && (
                        <label className={styles.subnoteToggle}>
                            <span className={styles.switch}>
                                <input
                                    type="checkbox"
                                    checked={includeSubnotes}
                                    onChange={(e) => setIncludeSubnotes(e.target.checked)}
                                />
                                <span className={styles.slider} />
                            </span>
                            <span className={styles.subnoteToggleLabel}>
                                Применить к подзаметкам
                                <span className={styles.subnoteToggleCount}>({subnoteIds.length})</span>
                            </span>
                        </label>
                    )}

                    <CollaboratorList
                        collaborators={collaborators}
                        loading={loading}
                        onUpdatePermission={(userId, perm) => handleUpdatePermission(userId, perm, cascadeIds)}
                        onRemove={(userId) => handleRemoveCollaborator(userId, cascadeIds)}
                    />

                    <LinkSharing noteId={noteId} open={open} />
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
});
