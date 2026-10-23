// IndexedDB storage for working without signal.
//
// Two object stores:
//   outbox – items saved while offline (or when the insert failed), waiting to upload.
//            Keyed by the item's own id, a UUID made on the device, so uploading the
//            same item twice can't create a duplicate.
//   cache  – copies of what the forms need to render offline: the item type list and
//            each type's field definitions. Keyed by a string like "fields:<typeId>".
//
// Plain IndexedDB, no extra dependency. Every function is safe to call during
// server rendering (it just resolves empty), since Next.js renders pages on the server first.

import { supabase } from "./supabase";

const DB_NAME = "traceability";
const DB_VERSION = 1;
const OUTBOX = "outbox";
const CACHE = "cache";

let dbPromise = null;

function openDb() {
  if (typeof indexedDB === "undefined") return Promise.resolve(null);
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(OUTBOX)) db.createObjectStore(OUTBOX, { keyPath: "id" });
        if (!db.objectStoreNames.contains(CACHE)) db.createObjectStore(CACHE);
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => {
        dbPromise = null;
        reject(req.error);
      };
    });
  }
  return dbPromise;
}

// Runs one request against a store and resolves with its result.
async function run(storeName, mode, fn) {
  const db = await openDb();
  if (!db) return undefined;
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, mode);
    const req = fn(tx.objectStore(storeName));
    tx.oncomplete = () => resolve(req?.result);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

// ---------- cache ----------

export function cacheSet(key, value) {
  return run(CACHE, "readwrite", (s) => s.put({ value, savedAt: Date.now() }, key)).catch(() => {});
}

export async function cacheGet(key) {
  try {
    const entry = await run(CACHE, "readonly", (s) => s.get(key));
    return entry ? entry.value : undefined;
  } catch {
    return undefined;
  }
}

// Runs a Supabase query; on success caches the rows, on failure (e.g. offline)
// returns the cached rows instead. Resolves { data, error, fromCache }.
export async function cachedQuery(key, makeQuery) {
  let res;
  try {
    res = await makeQuery();
  } catch (e) {
    res = { data: null, error: e };
  }
  if (!res.error && res.data) {
    cacheSet(key, res.data);
    return { data: res.data, error: null, fromCache: false };
  }
  const cached = await cacheGet(key);
  if (cached !== undefined) return { data: cached, error: null, fromCache: true };
  return { data: null, error: res.error, fromCache: false };
}

// ---------- outbox ----------

const listeners = new Set();

// Subscribe to outbox changes (to show a "N waiting to upload" count). Returns an unsubscribe function.
export function onOutboxChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function notify() {
  listeners.forEach((fn) => fn());
}

export async function queueItem(payload) {
  await run(OUTBOX, "readwrite", (s) => s.put({ ...payload, queued_at: new Date().toISOString() }));
  notify();
}

export async function outboxItems() {
  try {
    return (await run(OUTBOX, "readonly", (s) => s.getAll())) || [];
  } catch {
    return [];
  }
}

export async function outboxItem(id) {
  try {
    return await run(OUTBOX, "readonly", (s) => s.get(id));
  } catch {
    return undefined;
  }
}

async function removeFromOutbox(id) {
  await run(OUTBOX, "readwrite", (s) => s.delete(id));
}

// True when an error means "couldn't reach the server" rather than "the server said no".
// Only network failures are queued; a real rejection (bad data, no permission) is shown to the user.
export function isNetworkError(error) {
  if (typeof navigator !== "undefined" && navigator.onLine === false) return true;
  const msg = String(error?.message || error || "");
  return /Failed to fetch|NetworkError|Network request failed|Load failed|fetch failed/i.test(msg);
}

// Saves a new item: uploads it now if possible, otherwise keeps it in the outbox.
// Resolves "saved" or "queued". Throws only if the server rejected the item.
export async function saveItem(payload) {
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    await queueItem(payload);
    return "queued";
  }
  let error;
  try {
    ({ error } = await supabase.from("items").insert(payload));
  } catch (e) {
    error = e;
  }
  if (!error) return "saved";
  if (isNetworkError(error)) {
    await queueItem(payload);
    return "queued";
  }
  throw error;
}

let syncing = null;

// Uploads everything in the outbox. Items the server accepts (or already has) are removed;
// items it rejects stay, with the reason in last_error. Resolves { uploaded, failed }.
export function syncOutbox() {
  if (!syncing) {
    syncing = doSync().finally(() => {
      syncing = null;
    });
  }
  return syncing;
}

async function doSync() {
  const queued = await outboxItems();
  let uploaded = 0;
  let failed = 0;
  for (const entry of queued) {
    const { queued_at, last_error, ...payload } = entry;
    let error;
    try {
      // ignoreDuplicates: if an earlier attempt reached the server but the reply was lost,
      // the row already exists and this is a no-op instead of an error.
      ({ error } = await supabase.from("items").upsert(payload, { onConflict: "id", ignoreDuplicates: true }));
    } catch (e) {
      error = e;
    }
    if (!error) {
      await removeFromOutbox(entry.id);
      uploaded++;
    } else if (isNetworkError(error)) {
      break; // Still offline; try again later.
    } else {
      await run(OUTBOX, "readwrite", (s) => s.put({ ...entry, last_error: error.message }));
      failed++;
    }
  }
  notify();
  return { uploaded, failed };
}

// Starts automatic syncing: once now, and whenever the device comes back online.
// Called once from _app.js.
let autoSyncStarted = false;
export function startAutoSync() {
  if (autoSyncStarted || typeof window === "undefined" || !supabase) return;
  autoSyncStarted = true;
  window.addEventListener("online", () => syncOutbox());
  syncOutbox();
}
