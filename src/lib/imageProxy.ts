// Wikimedia rejects requests whose User-Agent doesn't identify a real
// browser or a properly-described bot (https://meta.wikimedia.org/wiki/User-Agent_policy)
// with a 429 — and Next's built-in image optimizer never forwards custom
// headers when fetching a remote src ("For security reasons... will not
// forward headers", per next/image's own docs), so its generic UA gets
// blocked outright. Routing just these hosts through our own proxy (which
// fetches with a compliant, identifying UA — same convention as
// scripts/name-unnamed-points.ts) fixes it without giving up next/image's
// resizing for these often-huge Wikimedia Commons originals.
const WIKIMEDIA_UPLOAD_PREFIX = "https://upload.wikimedia.org/";

export function isWikimediaUrl(url: string): boolean {
  return url.startsWith(WIKIMEDIA_UPLOAD_PREFIX);
}

/** Rewrites a Wikimedia photo URL to go through our own same-origin proxy
 * (see src/app/api/image-proxy/wikimedia/[...path]/route.ts) so next/image's
 * optimizer can fetch it without hitting Wikimedia's User-Agent block. Every
 * other host (admin uploads, future sources) passes through unchanged.
 *
 * A path, not a ?url= query string: Next 16's images.localPatterns requires
 * an exact literal `search` match for any local src with a query string, and
 * a different target URL per image can't be expressed that way — so the
 * target's own path becomes this route's path instead, needing no query
 * string at all (see next.config.ts's localPatterns entry). */
export function proxiedImageUrl(url: string): string {
  if (!isWikimediaUrl(url)) return url;
  const tail = url.slice(WIKIMEDIA_UPLOAD_PREFIX.length);
  return `/api/image-proxy/wikimedia/${tail}`;
}
