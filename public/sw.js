/* KAS REGU 3 — lightweight service worker.
 * Caches the app shell (HTML/manifest/icons) for installable offline-capable PWA.
 * NEVER caches /api/* — financial data is always network-fresh.
 */
const CACHE = 'kas-regu-3-v1';
const SHELL = [
  '/',
  '/index.html',
  '/admin.html',
  '/spin.html',
  '/manifest.json',
  '/icon.svg',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const { request } = e;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);

  // API: network only, never cache.
  if (url.pathname.startsWith('/api/')) return;

  // Navigations: network-first, fall back to cache (offline support).
  if (request.mode === 'navigate') {
    e.respondWith(
      fetch(request)
        .then((r) => {
          if (r.ok) {
            const copy = r.clone();
            caches.open(CACHE).then((c) => c.put(request, copy));
          }
          return r;
        })
        .catch(() => caches.match(request).then((m) => m || caches.match('/index.html')))
    );
    return;
  }

  // Static assets: cache-first, populate runtime cache on miss.
  e.respondWith(
    caches.match(request).then(
      (hit) =>
        hit ||
        fetch(request).then((r) => {
          if (r.ok && url.origin === self.location.origin) {
            const copy = r.clone();
            caches.open(CACHE).then((c) => c.put(request, copy));
          }
          return r;
        })
    )
  );
});
