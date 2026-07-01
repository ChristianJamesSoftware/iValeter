const CACHE_NAME = 'ivaleter-valeter-v1';
const OFFLINE_PAGES = ['/valeter', '/valeter/jobs'];
const OFFLINE_FALLBACK = '/valeter/offline';

// Install: pre-cache shell pages
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache =>
      cache.addAll(['/valeter', '/valeter/jobs', '/valeter/offline'])
        .catch(() => {}) // don't fail install if pages not pre-cacheable
    ).then(() => self.skipWaiting())
  );
});

// Activate: clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Fetch: network-first for HTML/API, cache-first for assets
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET and tRPC/API calls (let them fail naturally — we queue mutations separately)
  if (request.method !== 'GET') return;
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/trpc/')) return;

  // Static assets: cache-first
  if (url.pathname.match(/\.(js|css|woff2?|png|svg|ico)$/)) {
    event.respondWith(
      caches.match(request).then(cached => cached ?? fetch(request).then(res => {
        const clone = res.clone();
        caches.open(CACHE_NAME).then(c => c.put(request, clone));
        return res;
      }))
    );
    return;
  }

  // Valeter pages: network-first, fall back to cache, then offline page
  if (url.pathname.startsWith('/valeter')) {
    event.respondWith(
      fetch(request)
        .then(res => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(request, clone));
          return res;
        })
        .catch(() =>
          caches.match(request).then(cached => cached ?? caches.match(OFFLINE_FALLBACK))
        )
    );
    return;
  }
});

// Message: clients can send { type: 'SKIP_WAITING' }
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});
