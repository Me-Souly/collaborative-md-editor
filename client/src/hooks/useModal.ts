import { useState, useCallback } from 'react';

interface ModalState {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  variant?: 'danger' | 'default';
}

export const useModal = () => {
  const [modalState, setModalState] = useState<ModalState | null>(null);

  const showModal = useCallback((
    title: string,
    message: string,
    onConfirm: () => void,
    options?: {
      confirmText?: string;
      cancelText?: string;
      variant?: 'danger' | 'default';
    }
  ) => {
    setModalState({
      isOpen: true,
      title,
      message,
      onConfirm,
      confirmText: options?.confirmText,
      cancelText: options?.cancelText,
      variant: options?.variant || 'default',
    });
  }, []);

  const closeModal = useCallback(() => {
    setModalState(null);
  }, []);

  return {
    modalState,
    showModal,
    closeModal,
  };
};

