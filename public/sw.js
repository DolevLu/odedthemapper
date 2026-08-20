const CACHE_NAME = "odedthemapper-v4";
// Written to directly by src/lib/offlineStore.ts (the map screen's "download
// for offline" button) — POI photos are frequently hosted off our own
// domain (e.g. Wikipedia), so they need their own cache the same-origin-only
// logic below doesn't cover. Name must match OFFLINE_PHOTOS_CACHE there.
const OFFLINE_PHOTOS_CACHE = "travi-offline-photos-v1";

// Web Push: shows an OS-level notification for whatever the server sent
// (flight check-in reminders, budget alerts — see src/app/api/cron/notifications
// and src/lib/push.ts), and focuses/opens the relevant screen on tap.
self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = {};
  }
  const title = data.title || "עודד המנקד";
  event.waitUntil(
    self.registration.showNotification(title, {
      body: data.body || "",
      icon: "/icon.svg",
      badge: "/icon.svg",
      dir: "rtl",
      data: { url: data.url || "/" },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data && event.notification.data.url ? event.notification.data.url : "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(url) && "focus" in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow(url);
    })
  );
});

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.add("/offline").catch(() => {})));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  const keep = new Set([CACHE_NAME, OFFLINE_PHOTOS_CACHE]);
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((key) => !keep.has(key)).map((key) => caches.delete(key))))
  );
  self.clients.claim();
});

// Network-first, falling back to cache — lets a destination the user has
// already opened (map, itinerary, lists, ...) stay usable offline after the
// first visit, while always preferring fresh data when online. The catch
// path MUST resolve to a real Response no matter what — returning
// undefined here throws "Failed to convert value to 'Response'" and breaks
// the whole navigation (this previously masked itself as unrelated errors
// downstream, like a broken Google Maps load).
self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  if (url.origin !== self.location.origin) {
    // Cross-origin POI photos explicitly saved for offline use (see
    // src/lib/offlineStore.ts) — network first for freshness, falling back
    // to that dedicated cache only if the network fails. Every other
    // cross-origin request (Google Maps tiles/API, fonts) passes through
    // untouched, same as before — Maps tiles can't be legitimately cached
    // for offline use, so no attempt is made to.
    if (request.destination === "image") {
      event.respondWith(
        fetch(request).catch(async () => {
          const cache = await caches.open(OFFLINE_PHOTOS_CACHE);
          const cached = await cache.match(request);
          return cached || Response.error();
        })
      );
    }
    return;
  }

  if (url.pathname.startsWith("/api/")) return; // never cache API responses (auth/session/mutations)

  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        }
        return response;
      })
      .catch(async () => {
        const cached = await caches.match(request);
        if (cached) return cached;
        const offline = await caches.match("/offline");
        if (offline) return offline;
        return new Response("You're offline and this page hasn't been cached yet.", {
          status: 503,
          headers: { "Content-Type": "text/plain; charset=utf-8" },
        });
      })
  );
});
