import { useEffect } from 'react';
import { useStores } from '@hooks/useStores';
import { API_URL } from '@http';
import { getToken } from '@utils/tokenStorage';

export function useNotificationSSE() {
    const { rootStore } = useStores();
    const { notificationStore, sidebarStore, authStore } = rootStore;

    useEffect(() => {
        if (!authStore.isAuth) return;

        const token = getToken();
        if (!token) return;

        const url = `${API_URL}/notifications/stream?token=${encodeURIComponent(token)}`;
        const es = new EventSource(url);

        es.onopen = () => notificationStore.setSSEConnected(true);

        es.onmessage = (event) => {
            try {
                const payload = JSON.parse(event.data);
                if (payload.type === 'ping') return;

                if (payload.type === 'init') {
                    notificationStore.setNotifications(payload.notifications);
                    return;
                }

                notificationStore.addNotification(payload);

                if (payload.type === 'note_shared') {
                    sidebarStore.requestSharedNotesReload();
                }
            } catch (e) {
                console.error('[SSE] Failed to parse notification:', e);
            }
        };

        es.onerror = () => notificationStore.setSSEConnected(false);

        return () => {
            es.close();
            notificationStore.setSSEConnected(false);
        };
    }, [authStore.isAuth]); // eslint-disable-line react-hooks/exhaustive-deps
}
