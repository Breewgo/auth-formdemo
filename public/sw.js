// Service worker: lets the installed app open with no signal.
//
// - Pages: network first, falling back to the last copy saved. A page never opened
//   before falls back to the start page, which routes the user by role.
// - Next.js build files (/_next/static/...): their names change every build, so
//   they're served from the cache first.
// - Requests to other sites (Supabase) are never touched. Offline data lives in
//   IndexedDB instead (lib/offlineDb.js).
//
// Bump VERSION when this file changes so old caches are cleared.

const VERSION = "v1";
const CACHE = `traceability-${VERSION}`;
const CORE_PAGES = ["/", "/login", "/form-demo", "/scan", "/admin", "/admin/item-types"];
const CORE_FILES = ["/manifest.webmanifest", "/icon-192x192.png", "/icon-512x512.png", "/favicon.ico"];

// The build files a page needs, read from its HTML, so the page works offline
// even if it was never opened before.
function assetsIn(html) {
  const urls = new Set();
  for (const m of html.matchAll(/(?:src|href)="(\/_next\/static\/[^"]+)"/g)) urls.add(m[1]);
  return [...urls];
}

async function precache() {
  const cache = await caches.open(CACHE);
  await cache.addAll(CORE_FILES).catch(() => {});
  await Promise.all(
    CORE_PAGES.map(async (path) => {
      try {
        const res = await fetch(path, { cache: "no-store" });
        if (!res.ok) return;
        const html = await res.clone().text();
        await cache.put(path, res);
        await Promise.all(assetsIn(html).map((url) => cache.add(url).catch(() => {})));
      } catch {}
    })
  );
}

self.addEventListener("install", (event) => {
  event.waitUntil(precache().then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith("traceability-") && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(url.pathname, copy));
          }
          return res;
        })
        .catch(async () => {
          const cache = await caches.open(CACHE);
          return (await cache.match(url.pathname)) || (await cache.match("/")) || Response.error();
        })
    );
    return;
  }

  if (url.pathname.startsWith("/_next/static/") || CORE_FILES.includes(url.pathname)) {
    event.respondWith(
      caches.match(request).then(
        (hit) =>
          hit ||
          fetch(request).then((res) => {
            if (res.ok) {
              const copy = res.clone();
              caches.open(CACHE).then((c) => c.put(request, copy));
            }
            return res;
          })
      )
    );
  }
});
