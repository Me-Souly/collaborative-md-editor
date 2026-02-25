import React from 'react';
import { FileTreeNode } from '@app-types/notes';
import { MoreVerticalIcon } from '@components/common/ui/icons';
import { useSidebarStore, useAuthStore } from '@hooks/useStores';
import { useToastContext } from '@contexts/ToastContext';
import { useModal } from '@hooks/useModal';
import { Modal } from '@components/common/ui/Modal';
import { observer } from 'mobx-react-lite';
import $api from '@http';
import * as styles from '@components/sidebar/FileSidebar.module.css';

const cn = (...classes: (string | undefined | false)[]) => classes.filter(Boolean).join(' ');

interface TreeNodeMenuProps {
    node: FileTreeNode;
    isOpen: boolean;
    onToggle: () => void;
    onClose: () => void;
    onDelete?: () => void;
}

export const TreeNodeMenu: React.FC<TreeNodeMenuProps> = observer(
    ({ node, isOpen, onToggle, onClose, onDelete }) => {
        const sidebarStore = useSidebarStore();
        const authStore = useAuthStore();
        const toast = useToastContext();
        const { modalState, showModal, closeModal } = useModal();
        const isFolder = node.type === 'folder';
        const isActivated = authStore.user?.isActivated ?? false;

        const handleRename = (e: React.MouseEvent) => {
            e.stopPropagation();
            onClose();
            if (!isActivated) {
                toast.warning('Активируйте аккаунт, чтобы редактировать заметки');
                return;
            }
            sidebarStore.startEditing(node.id, 'rename');
        };

        const handleCreateFolder = (e: React.MouseEvent) => {
            e.stopPropagation();
            onClose();
            if (!isActivated) {
                toast.warning('Активируйте аккаунт, чтобы создавать папки');
                return;
            }
            sidebarStore.startEditing(`temp-folder-${Date.now()}`, 'create-folder', node.id);
        };

        const handleCreateNote = (e: React.MouseEvent) => {
            e.stopPropagation();
            onClose();
            if (!isActivated) {
                toast.warning('Активируйте аккаунт, чтобы создавать заметки');
                return;
            }
            sidebarStore.startEditing(`temp-note-${Date.now()}`, 'create-note', node.id);
        };

        const handleCreateSubnote = (e: React.MouseEvent) => {
            e.stopPropagation();
            onClose();
            if (!isActivated) {
                toast.warning('Активируйте аккаунт, чтобы создавать заметки');
                return;
            }
            sidebarStore.startEditing(`temp-subnote-${Date.now()}`, 'create-subnote', node.id);
        };

        const handleDelete = (e: React.MouseEvent) => {
            e.stopPropagation();
            onClose();
            if (!isActivated) {
                toast.warning('Активируйте аккаунт, чтобы удалять заметки');
                return;
            }
            e.stopPropagation();
            onClose();

            showModal(
                `Удалить ${isFolder ? 'папку' : 'заметку'}`,
                `Вы уверены, что хотите удалить "${node.name}"? Это действие нельзя отменить.`,
                async () => {
                    try {
                        if (isFolder) {
                            await $api.delete(`/folders/${node.id}`);
                        } else {
                            await $api.delete(`/notes/${node.id}`);
                        }

                        sidebarStore.deleteNode(node.id);
                        toast.success(`${isFolder ? 'Папка' : 'Заметка'} удалена`);

                        if (onDelete) {
                            onDelete();
                        }
                    } catch (err: any) {
                        console.error(`Failed to delete ${isFolder ? 'folder' : 'note'}:`, err);
                        // Error toast is handled by axios interceptor
                    }
                },
                {
                    confirmText: 'Удалить',
                    cancelText: 'Отмена',
                    variant: 'danger',
                },
            );
        };

        return (
            <>
                <div className={styles.dropdown}>
                    <button
                        className={styles.dropdownTrigger}
                        onClick={(e) => {
                            e.stopPropagation();
                            onToggle();
                        }}
                    >
                        <MoreVerticalIcon className={styles.iconSmall} />
                    </button>
                    {isOpen && (
                        <div className={styles.dropdownMenu}>
                            <button className={styles.dropdownItem} onClick={handleRename}>
                                Rename
                            </button>

                            {isFolder ? (
                                <>
                                    <button
                                        className={styles.dropdownItem}
                                        onClick={handleCreateFolder}
                                    >
                                        Create folder
                                    </button>
                                    <button
                                        className={styles.dropdownItem}
                                        onClick={handleCreateNote}
                                    >
                                        Create note
                                    </button>
                                </>
                            ) : (
                                <button
                                    className={styles.dropdownItem}
                                    onClick={handleCreateSubnote}
                                >
                                    Create subnote
                                </button>
                            )}

                            <button
                                className={cn(styles.dropdownItem, styles.dropdownItemDanger)}
                                onClick={handleDelete}
                            >
                                Delete
                            </button>
                        </div>
                    )}
                </div>
                {modalState && (
                    <Modal
                        isOpen={modalState.isOpen}
                        onClose={closeModal}
                        title={modalState.title}
                        message={modalState.message}
                        confirmText={modalState.confirmText}
                        cancelText={modalState.cancelText}
                        onConfirm={modalState.onConfirm}
                        variant={modalState.variant}
                    />
                )}
            </>
        );
    },
);
