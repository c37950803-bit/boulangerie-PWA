/**
 * @file service-worker.js
 * @description Service Worker pour le fonctionnement 100% hors-ligne de la PWA Boulangerie.
 * Stratégie Network-First avec repli Cache pour garantir la mise à jour immédiate
 * en développement et production tout en préservant le jeu 100% hors-ligne.
 */

const CACHE_NAME = 'boulangerie-pwa-v2.3';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/terminal.css',
  '/css/terminal.css',
  '/js/main.js',
  '/js/game-engine.js',
  '/js/economy.js',
  '/js/events.js',
  '/js/persistence.js',
  '/js/ui-terminal.js',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/icon-maskable.png',
  '/icons/icon.svg'
];

/**
 * Installation immédiate : active le nouveau worker sans attendre.
 */
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return Promise.allSettled(
        ASSETS_TO_CACHE.map((url) =>
          cache.add(url).catch((err) => {
            console.warn(`[SW] Impossible de pré-cacher ${url}:`, err);
          })
        )
      );
    })
  );
});

/**
 * Activation : purge immédiatement tous les anciens caches existants.
 */
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((name) => {
          if (name !== CACHE_NAME) {
            console.log(`[SW] Purge du cache obsolète : ${name}`);
            return caches.delete(name);
          }
        })
      );
    }).then(() => {
      return self.clients.claim();
    })
  );
});

/**
 * Fetch : Network-First avec fallback vers le cache hors-ligne.
 */
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET' || !event.request.url.startsWith('http')) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        if (
          networkResponse &&
          networkResponse.status === 200 &&
          networkResponse.type === 'basic'
        ) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          if (event.request.mode === 'navigate') {
            return caches.match('/index.html') || caches.match('/');
          }
        });
      })
  );
});
