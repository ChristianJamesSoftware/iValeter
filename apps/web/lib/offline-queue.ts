/**
 * offline-queue.ts
 * ─────────────────
 * Persistent offline mutation queue using IndexedDB.
 *
 * Queued action types:
 *   CLOCK_IN   — users.clockIn   { lat?, lng? }
 *   CLOCK_OUT  — users.clockOut  { lat?, lng? }
 *   JOB_STATUS — bookings.updateStatus { bookingId, toStatus, note? }
 *
 * Replay is triggered by:
 *   1. Background Sync API (service worker 'sync' event) — most reliable
 *   2. window 'online' event fallback — for browsers without Background Sync
 *   3. Manual call to replayQueue() on app mount
 */

const DB_NAME    = "ivaleter-offline";
const DB_VERSION = 1;
const STORE_NAME = "queue";
const SYNC_TAG   = "ivaleter-offline-sync";

// ── Types ─────────────────────────────────────────────────────────────────────

export type QueuedActionType = "CLOCK_IN" | "CLOCK_OUT" | "JOB_STATUS";

interface ClockPayload {
  lat?: number;
  lng?: number;
}

interface JobStatusPayload {
  bookingId: string;
  toStatus: string;
  note?: string;
}

export interface QueuedAction {
  id: string;          // crypto.randomUUID()
  type: QueuedActionType;
  payload: ClockPayload | JobStatusPayload;
  queuedAt: number;    // Date.now()
  attempts: number;
}

// ── DB bootstrap ──────────────────────────────────────────────────────────────

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE_NAME, { keyPath: "id" });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror   = () => reject(req.error);
  });
}

// ── Queue CRUD ────────────────────────────────────────────────────────────────

export async function enqueue(
  type: QueuedActionType,
  payload: ClockPayload | JobStatusPayload,
): Promise<QueuedAction> {
  const db = await openDb();
  const action: QueuedAction = {
    id:       crypto.randomUUID(),
    type,
    payload,
    queuedAt: Date.now(),
    attempts: 0,
  };
  await new Promise<void>((resolve, reject) => {
    const tx  = db.transaction(STORE_NAME, "readwrite");
    const req = tx.objectStore(STORE_NAME).add(action);
    req.onsuccess = () => resolve();
    req.onerror   = () => reject(req.error);
  });
  db.close();

  // Request Background Sync if supported
  if ("serviceWorker" in navigator && "SyncManager" in window) {
    try {
      const reg = await navigator.serviceWorker.ready;
      await (reg as ServiceWorkerRegistration & { sync: { register(tag: string): Promise<void> } }).sync.register(SYNC_TAG);
    } catch {
      // Background Sync not available — online listener will handle it
    }
  }

  return action;
}

async function dequeue(id: string): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx  = db.transaction(STORE_NAME, "readwrite");
    const req = tx.objectStore(STORE_NAME).delete(id);
    req.onsuccess = () => resolve();
    req.onerror   = () => reject(req.error);
  });
  db.close();
}

export async function getPendingActions(): Promise<QueuedAction[]> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx  = db.transaction(STORE_NAME, "readonly");
    const req = tx.objectStore(STORE_NAME).getAll();
    req.onsuccess = () => { db.close(); resolve((req.result as QueuedAction[]).sort((a, b) => a.queuedAt - b.queuedAt)); };
    req.onerror   = () => { db.close(); reject(req.error); };
  });
}

async function incrementAttempts(id: string, action: QueuedAction): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx  = db.transaction(STORE_NAME, "readwrite");
    const req = tx.objectStore(STORE_NAME).put({ ...action, attempts: action.attempts + 1 });
    req.onsuccess = () => resolve();
    req.onerror   = () => reject(req.error);
  });
  db.close();
}

// ── Replay ────────────────────────────────────────────────────────────────────

/**
 * Fire each queued action against the tRPC HTTP endpoint directly
 * (avoids React hook dependency — safe to call from SW or event listeners).
 */
export async function replayQueue(): Promise<{ replayed: number; failed: number; droppedClockOuts: number }> {
  if (!navigator.onLine) return { replayed: 0, failed: 0, droppedClockOuts: 0 };

  const actions = await getPendingActions();
  if (actions.length === 0) return { replayed: 0, failed: 0, droppedClockOuts: 0 };

  let replayed = 0;
  let failed   = 0;
  let droppedClockOuts = 0;

  for (const action of actions) {
    try {
      await executeAction(action);
      await dequeue(action.id);
      replayed++;
      // Notify service worker so UI can refresh
      if (navigator.serviceWorker?.controller) {
        navigator.serviceWorker.controller.postMessage({ type: "QUEUE_REPLAYED" });
      }
    } catch {
      await incrementAttempts(action.id, action);
      // Drop after 10 failed attempts to avoid indefinite retry
      if (action.attempts >= 9) {
        await dequeue(action.id);
        // If this was a clock-out, flag it — payroll risk
        if (action.type === "CLOCK_OUT") {
          droppedClockOuts++;
          // Store a flag in localStorage so the app can warn the valeter
          localStorage.setItem(
            "ivaleter:missed_clockout",
            JSON.stringify({ at: action.queuedAt, attempts: action.attempts + 1 }),
          );
        }
      }
      failed++;
    }
  }

  return { replayed, failed, droppedClockOuts };
}

// ── HTTP execution (no React) ─────────────────────────────────────────────────

async function trpcPost(procedure: string, input: unknown): Promise<void> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000); // 10s timeout
  try {
    const res = await fetch(`/api/trpc/${procedure}`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ json: input }),
      signal:  controller.signal,
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`tRPC ${procedure} failed: ${res.status} ${text}`);
    }
  } finally {
    clearTimeout(timeout);
  }
}

async function executeAction(action: QueuedAction): Promise<void> {
  switch (action.type) {
    case "CLOCK_IN":
      await trpcPost("users.clockIn", action.payload);
      break;
    case "CLOCK_OUT":
      await trpcPost("users.clockOut", action.payload);
      break;
    case "JOB_STATUS": {
      const p = action.payload as JobStatusPayload;
      await trpcPost("bookings.updateStatus", {
        bookingId: p.bookingId,
        toStatus:  p.toStatus,
        note:      p.note,
      });
      break;
    }
  }
}

// ── Pending count helper (for UI badge) ──────────────────────────────────────

export async function pendingCount(): Promise<number> {
  try {
    const actions = await getPendingActions();
    return actions.length;
  } catch {
    return 0;
  }
}

// ── Clear entire queue (e.g. after logout or stuck items) ─────────────────────

export async function clearQueue(): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx  = db.transaction(STORE_NAME, "readwrite");
    const req = tx.objectStore(STORE_NAME).clear();
    req.onsuccess = () => resolve();
    req.onerror   = () => reject(req.error);
  });
  db.close();
}
