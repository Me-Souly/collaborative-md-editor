import React, { createContext, useContext, ReactNode, useEffect, useMemo } from 'react';
import { useToast } from '@hooks/useToast';
import { ToastContainer } from '@components/common/ui/ToastContainer';
import { toastManager } from '@utils/toastManager';

interface ToastContextType {
  success: (message: string, duration?: number) => string;
  error: (message: string, duration?: number) => string;
  warning: (message: string, duration?: number) => string;
  info: (message: string, duration?: number) => string;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToastContext = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToastContext must be used within ToastProvider');
  }
  return context;
};

interface ToastProviderProps {
  children: ReactNode;
}

export const ToastProvider: React.FC<ToastProviderProps> = ({ children }) => {
  const { toasts, removeToast, showToast } = useToast();

  useEffect(() => {
    console.log('ToastProvider: subscribing to toastManager');
    const unsubscribe = toastManager.subscribe((toast) => {
      console.log('ToastProvider: received toast from toastManager', toast);
      showToast(toast.message, toast.type, toast.duration);
    });

    return () => {
      console.log('ToastProvider: unsubscribing from toastManager');
      unsubscribe();
    };
  }, [showToast]);

  const contextValue = useMemo(() => ({
    success: (message: string, duration?: number) => toastManager.success(message, duration),
    error: (message: string, duration?: number) => toastManager.error(message, duration),
    warning: (message: string, duration?: number) => toastManager.warning(message, duration),
    info: (message: string, duration?: number) => toastManager.info(message, duration),
  }), []);

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  );
};

