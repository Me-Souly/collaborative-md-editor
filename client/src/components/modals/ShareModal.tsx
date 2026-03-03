import React, { useMemo, useState } from 'react';
import { XIcon } from '@components/common/ui/icons';
import { useShareModal } from '@components/modals/hooks/useShareModal';
import { useSidebarStore } from '@hooks/useStores';
import { observer } from 'mobx-react-lite';
import type { FileTreeNode } from '@app-types/notes';
import { InviteForm } from '@components/modals/InviteForm';
import { CollaboratorList } from '@components/modals/CollaboratorList';
import { LinkSharing } from '@components/modals/LinkSharing';
import * as styles from '@components/modals/ShareModal.module.css';

const cn = (...classes: (string | undefined | false)[]) => classes.filter(Boolean).join(' ');

/** Collect IDs of all file-type descendants */
function collectFileDescendantIds(nodes: FileTreeNode[]): string[] {
    const ids: string[] = [];
    for (const node of nodes) {
        if (node.type === 'file') ids.push(node.id);
        if (node.children?.length) ids.push(...collectFileDescendantIds(node.children));
    }
    return ids;
}

interface ShareModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    noteId: string;
    noteTitle: string;
}

export const ShareModal: React.FC<ShareModalProps> = observer(({
    open,
    onOpenChange,
    noteId,
    noteTitle,
}) => {
    const sidebarStore = useSidebarStore();
    const {
        collaborators,
        users,
        loading,
        handleInvite,
        handleRemoveCollaborator,
        handleUpdatePermission,
    } = useShareModal(noteId, open);

    const [includeSubnotes, setIncludeSubnotes] = useState(false);

    // Compute all direct + nested sub-note IDs from the sidebar tree
    const subnoteIds = useMemo(() => {
        function find(nodes: FileTreeNode[], id: string): string[] | null {
            for (const node of nodes) {
                if (node.id === id) return collectFileDescendantIds(node.children ?? []);
                if (node.children?.length) {
                    const r = find(node.children, id);
                    if (r !== null) return r;
                }
            }
            return null;
        }
        return find(sidebarStore.fileTree, noteId) ?? [];
    }, [sidebarStore.fileTree, noteId]);

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
});
