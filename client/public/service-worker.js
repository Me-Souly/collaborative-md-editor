// Note Editor — Service Worker
// Стратегии кэширования:
// - Статика (JS/CSS/шрифты/иконки): Cache-First
// - API GET-запросы: Network-First с fallback на кэш
// - Навигация (HTML): Network-First, offline → кэшированный index.html
// - API мутации (POST/PUT/DELETE): Network-Only

const CACHE_VERSION = 'v1';
const STATIC_CACHE = `note-editor-static-${CACHE_VERSION}`;
const API_CACHE = `note-editor-api-${CACHE_VERSION}`;
const FONT_CACHE = `note-editor-fonts-${CACHE_VERSION}`;

// Файлы для предварительного кэширования (app shell)
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon.svg',
  '/favicon.ico',
];

// ========================
// INSTALL — кэшируем app shell
// ========================
self.addEventListener('install', (event) => {
  console.log('[SW] Install');
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      return cache.addAll(PRECACHE_URLS);
    })
  );
  // Активируемся сразу, не ждём закрытия старых вкладок
  self.skipWaiting();
});

// ========================
// ACTIVATE — удаляем устаревшие кэши
// ========================
self.addEventListener('activate', (event) => {
  console.log('[SW] Activate');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => {
            // Удаляем кэши с другой версией
            return (
              name.startsWith('note-editor-') &&
              name !== STATIC_CACHE &&
              name !== API_CACHE &&
              name !== FONT_CACHE
            );
          })
          .map((name) => {
            console.log(`[SW] Удаляем устаревший кэш: ${name}`);
            return caches.delete(name);
          })
      );
    })
  );
  // Берём контроль над всеми открытыми вкладками
  self.clients.claim();
});

// ========================
// FETCH — маршрутизация запросов
// ========================
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Пропускаем не-GET запросы (мутации идут напрямую в сеть)
  if (request.method !== 'GET') {
    return;
  }

  // Пропускаем chrome-extension и другие нестандартные протоколы
  if (!url.protocol.startsWith('http')) {
    return;
  }

  // Google Fonts — Cache-First
  if (
    url.hostname === 'fonts.googleapis.com' ||
    url.hostname === 'fonts.gstatic.com'
  ) {
    event.respondWith(cacheFirst(request, FONT_CACHE));
    return;
  }

  // API запросы — Network-First
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirst(request, API_CACHE));
    return;
  }

  // Навигационные запросы (HTML-страницы) — Network-First с fallback на кэшированный index.html
  if (request.mode === 'navigate') {
    event.respondWith(navigationHandler(request));
    return;
  }

  // Статические ресурсы (JS/CSS/изображения/шрифты) — Cache-First
  event.respondWith(cacheFirst(request, STATIC_CACHE));
});

// ========================
// Стратегия: Cache-First
// Сначала ищем в кэше, при промахе идём в сеть и кэшируем ответ
// ========================
async function cacheFirst(request, cacheName) {
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }

  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    // Офлайн и нет в кэше — возвращаем fallback
    return new Response('Offline', {
      status: 503,
      statusText: 'Service Unavailable',
    });
  }
}

// ========================
// Стратегия: Network-First
// Сначала пытаемся получить из сети, при ошибке — из кэша
// ========================
async function networkFirst(request, cacheName) {
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    return new Response(
      JSON.stringify({ error: 'Offline', message: 'No cached data available' }),
      {
        status: 503,
        statusText: 'Service Unavailable',
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

// ========================
// Обработчик навигации
// Network-First, при офлайне возвращаем кэшированный index.html (SPA)
// ========================
async function navigationHandler(request) {
  try {
    const networkResponse = await fetch(request);
    // Кэшируем index.html при каждом успешном запросе
    if (networkResponse.ok) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put('/index.html', networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    // Офлайн — отдаём кэшированный index.html
    const cachedResponse = await caches.match('/index.html');
    if (cachedResponse) {
      return cachedResponse;
    }
    return new Response(
      '<html><body><h1>Offline</h1><p>Note Editor is not available offline. Please check your connection.</p></body></html>',
      {
        status: 503,
        headers: { 'Content-Type': 'text/html' },
      }
    );
  }
}

// ========================
// Сообщения от клиента
// ========================
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  // Очистка кэша API (например, после logout)
  if (event.data && event.data.type === 'CLEAR_API_CACHE') {
    caches.delete(API_CACHE).then(() => {
      console.log('[SW] API cache cleared');
    });
  }
});
