import React from 'react';
import { PlusIcon, FolderPlusIcon } from '@components/common/ui/icons';
import { useSidebarStore, useAuthStore } from '@hooks/useStores';
import { useToastContext } from '@contexts/ToastContext';
import { observer } from 'mobx-react-lite';
import * as styles from '@components/sidebar/FileSidebar.module.css';

const cn = (...classes: (string | undefined | false)[]) => classes.filter(Boolean).join(' ');

interface QuickActionsProps {
    collapsed: boolean;
}

export const QuickActions: React.FC<QuickActionsProps> = observer(({ collapsed }) => {
    const sidebarStore = useSidebarStore();
    const authStore = useAuthStore();
    const toast = useToastContext();

    const handleCreateNote = () => {
        if (!authStore.user?.isActivated) {
            toast.warning('Активируйте аккаунт, чтобы создавать заметки');
            return;
        }
        // Create note in root (no folderId, no parentId)
        sidebarStore.startEditing(`temp-note-${Date.now()}`, 'create-note', null);
    };

    const handleCreateFolder = () => {
        if (!authStore.user?.isActivated) {
            toast.warning('Активируйте аккаунт, чтобы создавать папки');
            return;
        }
        // Create folder in root (no parentId)
        sidebarStore.startEditing(`temp-folder-${Date.now()}`, 'create-folder', null);
    };

    return (
        <div className={styles.quickActions}>
            <button
                className={cn(styles.button, styles.buttonPrimary)}
                title={collapsed ? 'New Note (Ctrl+N)' : undefined}
                onClick={handleCreateNote}
            >
                <PlusIcon className={styles.icon} />
                {!collapsed && <span>New Note</span>}
            </button>

            <button
                className={cn(styles.button, styles.buttonOutline)}
                title={collapsed ? 'New Folder' : undefined}
                onClick={handleCreateFolder}
            >
                <FolderPlusIcon className={styles.icon} />
                {!collapsed && <span>New Folder</span>}
            </button>
        </div>
    );
});
