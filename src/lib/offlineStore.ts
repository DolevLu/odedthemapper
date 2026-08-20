"use client";

// Name must match OFFLINE_PHOTOS_CACHE in public/sw.js — the service
// worker's fetch handler serves cross-origin images from this exact cache
// when the network fails, so anything saved here transparently becomes
// available offline the next time an <img> tries to load it, with no extra
// client-side plumbing (no blob URLs, no manual lookups).
const PHOTOS_CACHE = "travi-offline-photos-v1";
const DATA_CACHE = "travi-offline-data-v1";

function poisCacheKey(slug: string): string {
  // A synthetic same-origin URL used only as a cache key — never actually
  // fetched over the network.
  return `${self.location.origin}/__offline__/pois/${slug}.json`;
}

export function isOfflineStorageSupported(): boolean {
  return typeof window !== "undefined" && "caches" in window;
}

export type OfflinePoi = { id: string; photoUrl: string | null };

/** Saves a destination's POI data + photos for offline use. The page itself
 * (this HTML/JS, with all POI data already embedded) gets cached
 * automatically by the service worker on every visit — this only needs to
 * additionally fetch each photo (often hosted off our own domain, so it
 * needs its own cache; see sw.js) so <img> tags still resolve with no
 * network. Best-effort throughout: a handful of photos failing to fetch
 * (offline right now, a dead link, hard CORS block) doesn't fail the whole
 * save — the rest still gets stored. */
export async function saveDestinationOffline(
  slug: string,
  pois: OfflinePoi[],
  onProgress?: (done: number, total: number) => void
): Promise<void> {
  if (!isOfflineStorageSupported()) throw new Error("הדפדפן הזה לא תומך בשמירה אופליין");

  const dataCache = await caches.open(DATA_CACHE);
  await dataCache.put(
    poisCacheKey(slug),
    new Response(JSON.stringify({ savedAt: new Date().toISOString(), poiCount: pois.length }), {
      headers: { "Content-Type": "application/json" },
    })
  );

  const photoCache = await caches.open(PHOTOS_CACHE);
  const photoUrls = Array.from(new Set(pois.map((p) => p.photoUrl).filter((u): u is string => Boolean(u))));

  let done = 0;
  onProgress?.(0, photoUrls.length);
  for (const url of photoUrls) {
    try {
      const already = await photoCache.match(url);
      if (!already) {
        // no-cors: most photo hosts (e.g. Wikipedia) don't send permissive
        // CORS headers, so a normal fetch would be blocked from being read —
        // an opaque no-cors response can still be cached and later served
        // as an <img> resource, just not inspected by JS, which is fine here.
        const res = await fetch(url, { mode: "no-cors" });
        await photoCache.put(url, res);
      }
    } catch {
      // skip this one photo, keep going
    } finally {
      done++;
      onProgress?.(done, photoUrls.length);
    }
  }
}

export async function isDestinationSavedOffline(slug: string): Promise<boolean> {
  if (!isOfflineStorageSupported()) return false;
  const dataCache = await caches.open(DATA_CACHE);
  const match = await dataCache.match(poisCacheKey(slug));
  return Boolean(match);
}

export async function clearDestinationOffline(slug: string): Promise<void> {
  if (!isOfflineStorageSupported()) return;
  const dataCache = await caches.open(DATA_CACHE);
  await dataCache.delete(poisCacheKey(slug));
}
