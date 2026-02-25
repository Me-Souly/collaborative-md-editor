import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSidebarStore, useAuthStore } from '@hooks/useStores';
import { useToastContext } from '@contexts/ToastContext';
import { useModal } from '@hooks/useModal';
import $api from '@http';

interface UseNoteCardActionsProps {
  noteId: string;
  noteTitle: string;
  isPublic: boolean;
  onDelete?: () => void;
}

export const useNoteCardActions = ({
  noteId,
  noteTitle,
  isPublic: initialIsPublic,
  onDelete,
}: UseNoteCardActionsProps) => {
  const navigate = useNavigate();
  const sidebarStore = useSidebarStore();
  const authStore = useAuthStore();
  const toast = useToastContext();
  const { modalState, showModal, closeModal } = useModal();
  const [isPublic, setIsPublic] = useState<boolean>(initialIsPublic);
  const isActivated = authStore.user?.isActivated ?? false;

  const handleRename = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isActivated) {
      toast.warning('Активируйте аккаунт, чтобы редактировать заметки');
      return;
    }
    navigate(`/note/${noteId}`);
    setTimeout(() => {
      sidebarStore.startEditing(noteId, 'rename');
    }, 100);
  }, [isActivated, navigate, noteId, sidebarStore, toast]);

  const handleCreateSubnote = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isActivated) {
      toast.warning('Активируйте аккаунт, чтобы создавать заметки');
      return;
    }
    navigate(`/note/${noteId}`);
    setTimeout(() => {
      sidebarStore.startEditing(`temp-subnote-${Date.now()}`, 'create-subnote', noteId);
    }, 100);
  }, [isActivated, navigate, noteId, sidebarStore, toast]);

  const handleTogglePublic = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();

    if (!isActivated) {
      toast.warning('Активируйте аккаунт, чтобы делать заметки публичными');
      return;
    }

    const makePublic = !isPublic;

    try {
      await $api.put(`/notes/${noteId}`, { isPublic: makePublic });
      setIsPublic(makePublic);
      toast.success(makePublic ? 'Note is now public' : 'Note is now private');
    } catch (err: any) {
      console.error('Failed to toggle public state:', err);
    }
  }, [isActivated, isPublic, noteId, toast]);

  const handleDelete = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();

    if (!isActivated) {
      toast.warning('Активируйте аккаунт, чтобы удалять заметки');
      return;
    }

    showModal(
      'Удалить заметку',
      `Вы уверены, что хотите удалить "${noteTitle}"? Это действие нельзя отменить.`,
      async () => {
        try {
          await $api.delete(`/notes/${noteId}`);
          toast.success('Заметка удалена');
          if (onDelete) {
            onDelete();
          }
        } catch (err: any) {
          console.error('Failed to delete note:', err);
        }
      },
      {
        confirmText: 'Удалить',
        cancelText: 'Отмена',
        variant: 'danger',
      }
    );
  }, [isActivated, noteId, noteTitle, onDelete, showModal, toast]);

  return {
    isPublic,
    modalState,
    closeModal,
    handleRename,
    handleCreateSubnote,
    handleTogglePublic,
    handleDelete,
  };
};

