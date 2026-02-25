import { ToastData, ToastType } from '@components/common/ui/Toast';

type ToastCallback = (toast: ToastData) => void;

class ToastManager {
  private listeners: Set<ToastCallback> = new Set();

  subscribe(callback: ToastCallback) {
    this.listeners.add(callback);
    return () => {
      this.listeners.delete(callback);
    };
  }

  private notify(toast: ToastData) {
    console.log('ToastManager: notifying listeners', toast, 'Listeners count:', this.listeners.size);
    this.listeners.forEach((callback) => {
      try {
        callback(toast);
      } catch (e) {
        console.error('Error in toast callback:', e);
      }
    });
  }

  show(message: string, type: ToastType = 'info', duration?: number) {
    const id = `toast-${Date.now()}-${Math.random()}`;
    console.log('ToastManager: showing toast', { id, message, type, duration });
    this.notify({ id, message, type, duration });
    return id;
  }

  success(message: string, duration?: number) {
    return this.show(message, 'success', duration);
  }

  error(message: string, duration?: number) {
    return this.show(message, 'error', duration);
  }

  warning(message: string, duration?: number) {
    return this.show(message, 'warning', duration);
  }

  info(message: string, duration?: number) {
    return this.show(message, 'info', duration);
  }
}

export const toastManager = new ToastManager();

