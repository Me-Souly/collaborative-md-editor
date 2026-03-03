import React from 'react';
import { PlusIcon, FolderPlusIcon } from '@components/common/ui/icons';
import { useSidebarStore, useAuthStore } from '@hooks/useStores';
import { useToastContext } from '@contexts/ToastContext';
import { observer } from 'mobx-react-lite';
import * as styles from '@components/sidebar/FileSidebar.module.css';

const cn = (...classes: (string | undefined | false)[]) => classes.filter(Boolean).join(' ');

export const QuickActions: React.FC = observer(() => {
    const sidebarStore = useSidebarStore();
    const authStore = useAuthStore();
    const toast = useToastContext();

    const handleCreateNote = () => {
        if (!authStore.user?.isActivated) {
            toast.warning('Активируйте аккаунт, чтобы создавать заметки');
            return;
        }
        sidebarStore.startEditing(`temp-note-${Date.now()}`, 'create-note', null);
    };

    const handleCreateFolder = () => {
        if (!authStore.user?.isActivated) {
            toast.warning('Активируйте аккаунт, чтобы создавать папки');
            return;
        }
        sidebarStore.startEditing(`temp-folder-${Date.now()}`, 'create-folder', null);
    };

    return (
        <div className={cn(styles.quickActions, styles.quickActionsRow)}>
            <button
                className={cn(styles.button, styles.buttonDashed)}
                onClick={handleCreateNote}
                title="New Note (Ctrl+N)"
            >
                <PlusIcon className={styles.icon} />
                <span>New Note</span>
            </button>

            <button
                className={cn(styles.button, styles.buttonDashed)}
                onClick={handleCreateFolder}
                title="New Folder"
            >
                <FolderPlusIcon className={styles.icon} />
                <span>New Folder</span>
            </button>
        </div>
    );
});
