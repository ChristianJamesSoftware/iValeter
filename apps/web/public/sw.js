const CACHE_NAME    = 'ivaleter-valeter-v2';
const OFFLINE_PAGES = ['/valeter', '/valeter/jobs'];
const OFFLINE_FALLBACK = '/valeter/offline';
const SYNC_TAG      = 'ivaleter-offline-sync';

// ── IndexedDB helpers (duplicated here — SW has no module imports) ────────────

const DB_NAME    = 'ivaleter-offline';
const DB_VERSION = 1;
const STORE_NAME = 'queue';

function swOpenDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE_NAME, { keyPath: 'id' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror   = () => reject(req.error);
  });
}

async function swGetPending() {
  const db = await swOpenDb();
  return new Promise((resolve, reject) => {
    const tx  = db.transaction(STORE_NAME, 'readonly');
    const req = tx.objectStore(STORE_NAME).getAll();
    req.onsuccess = () => { db.close(); resolve(req.result.sort((a, b) => a.queuedAt - b.queuedAt)); };
    req.onerror   = () => { db.close(); reject(req.error); };
  });
}

async function swDequeue(id) {
  const db = await swOpenDb();
  return new Promise((resolve, reject) => {
    const tx  = db.transaction(STORE_NAME, 'readwrite');
    const req = tx.objectStore(STORE_NAME).delete(id);
    req.onsuccess = () => { db.close(); resolve(); };
    req.onerror   = () => { db.close(); reject(req.error); };
  });
}

async function swIncrementAttempts(action) {
  const db = await swOpenDb();
  return new Promise((resolve, reject) => {
    const tx  = db.transaction(STORE_NAME, 'readwrite');
    const req = tx.objectStore(STORE_NAME).put({ ...action, attempts: action.attempts + 1 });
    req.onsuccess = () => { db.close(); resolve(); };
    req.onerror   = () => { db.close(); reject(req.error); };
  });
}

// ── Action executor ───────────────────────────────────────────────────────────

async function executeAction(action) {
  let procedure, input;
  switch (action.type) {
    case 'CLOCK_IN':
      procedure = 'users.clockIn';
      input = action.payload;
      break;
    case 'CLOCK_OUT':
      procedure = 'users.clockOut';
      input = action.payload;
      break;
    case 'JOB_STATUS':
      procedure = 'bookings.updateStatus';
      input = {
        bookingId: action.payload.bookingId,
        toStatus:  action.payload.toStatus,
        note:      action.payload.note,
      };
      break;
    default:
      throw new Error('Unknown action type: ' + action.type);
  }

  const res = await fetch(`/api/trpc/${procedure}`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ json: input }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${procedure} failed: ${res.status} ${text}`);
  }
}

// ── Replay all queued actions ─────────────────────────────────────────────────

async function replayQueue() {
  const actions = await swGetPending();
  for (const action of actions) {
    try {
      await executeAction(action);
      await swDequeue(action.id);
      console.log('[SW] Replayed:', action.type, action.id);
    } catch (err) {
      console.warn('[SW] Replay failed:', action.type, err.message);
      await swIncrementAttempts(action);
      if (action.attempts >= 9) {
        await swDequeue(action.id);
        console.warn('[SW] Dropped after 10 attempts:', action.id);
      }
      // Re-throw so Background Sync retries the whole batch
      throw err;
    }
  }
}

// ── Install ───────────────────────────────────────────────────────────────────

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache =>
      cache.addAll(['/valeter', '/valeter/jobs', '/valeter/offline'])
        .catch(() => {})
    ).then(() => self.skipWaiting())
  );
});

// ── Activate ──────────────────────────────────────────────────────────────────

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// ── Background Sync ───────────────────────────────────────────────────────────

self.addEventListener('sync', (event) => {
  if (event.tag === SYNC_TAG) {
    event.waitUntil(replayQueue());
  }
});

// ── Fetch ─────────────────────────────────────────────────────────────────────

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET
  if (request.method !== 'GET') return;

  // Let tRPC/API calls through — we queue mutations ourselves
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/trpc/')) return;

  // Static assets: cache-first
  if (url.pathname.match(/\.(js|css|woff2?|png|svg|ico|webmanifest)$/)) {
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

// ── Message ───────────────────────────────────────────────────────────────────

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
  // Manual replay trigger from online event
  if (event.data?.type === 'REPLAY_QUEUE') {
    event.waitUntil(
      replayQueue().then(() => {
        // Notify all valeter clients to refresh
        self.clients.matchAll({ type: 'window' }).then(clients => {
          clients.forEach(client => {
            if (client.url.includes('/valeter')) {
              client.postMessage({ type: 'QUEUE_REPLAYED' });
            }
          });
        });
      }).catch(() => {})
    );
  }
});
