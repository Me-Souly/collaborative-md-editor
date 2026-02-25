import { useState, useEffect } from 'react';

export type ConnectionStatus = 'connected' | 'connecting' | 'offline';

/**
 * Отслеживает статус подключения — комбинирует состояние сети (navigator.onLine)
 * и статус Yjs WebSocket-провайдера.
 */
export function useConnectionStatus(provider: any): ConnectionStatus {
    const [status, setStatus] = useState<ConnectionStatus>(() => {
        if (typeof navigator !== 'undefined' && !navigator.onLine) return 'offline';
        return 'connecting';
    });

    useEffect(() => {
        if (!provider) return;

        const updateStatus = (wsStatus?: string) => {
            if (typeof navigator !== 'undefined' && !navigator.onLine) {
                setStatus('offline');
                return;
            }
            if (wsStatus === 'connected' || provider.wsconnected) {
                setStatus('connected');
            } else {
                setStatus('connecting');
            }
        };

        const handleStatus = ({ status: wsStatus }: { status: string }) => {
            updateStatus(wsStatus);
        };

        const handleOnline = () => updateStatus();
        const handleOffline = () => setStatus('offline');

        provider.on('status', handleStatus);
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        // Начальное состояние
        updateStatus(provider.wsconnected ? 'connected' : 'disconnected');

        return () => {
            provider.off('status', handleStatus);
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, [provider]);

    return status;
}
