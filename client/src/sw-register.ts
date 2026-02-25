/**
 * Регистрация Service Worker для PWA.
 * Регистрируется только в production-режиме.
 */
export async function registerServiceWorker(): Promise<void> {
    if (!('serviceWorker' in navigator)) {
        return;
    }

    if (process.env.NODE_ENV !== 'production') {
        console.log('[SW] Skipping registration in development mode');
        return;
    }

    try {
        const registration = await navigator.serviceWorker.register('/service-worker.js');
        console.log('[SW] Registered successfully, scope:', registration.scope);

        registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            if (!newWorker) return;

            newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'activated' && navigator.serviceWorker.controller) {
                    console.log('[SW] New version available — reload to update');
                }
            });
        });
    } catch (error) {
        console.error('[SW] Registration failed:', error);
    }
}

/**
 * Отправляет сообщение service worker для очистки API-кэша.
 * Вызывается при logout.
 */
export function clearSwApiCache(): void {
    if (navigator.serviceWorker?.controller) {
        navigator.serviceWorker.controller.postMessage({ type: 'CLEAR_API_CACHE' });
    }
}
