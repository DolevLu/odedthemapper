import { NextResponse } from "next/server";

// Same descriptive UA convention already used for the Wikipedia-facing
// backfill script (scripts/name-unnamed-points.ts) — required by Wikimedia's
// own User-Agent policy to avoid the generic-bot 429 this route exists to
// work around (see lib/imageProxy.ts for the full story).
const USER_AGENT = "OdedHaMapper/1.0 (travel app image proxy; contact: dolev0018@gmail.com)";

// A path segment, not a ?url= query string: Next 16 requires
// images.localPatterns.search to be a literal exact-match string (no
// wildcards) for any local image src with a query string — incompatible
// with a different target URL per image. The path itself is the target's
// tail instead, so this route needs no query string, matching the
// localPatterns entry in next.config.ts (search: "").
export async function GET(_req: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  if (!path || path.length === 0) return new NextResponse("Not allowed", { status: 400 });

  const target = `https://upload.wikimedia.org/${path.map(encodeURIComponent).join("/")}`;

  // Full-size originals on Commons are often 5-20MB. With next/image's resizer out of the path (see next.config.ts
  // images.unoptimized) they are fetched as Wikimedia's own 960px thumbnail instead, falling back to the original only
  // if Wikimedia has no such thumbnail (e.g. the original is smaller than 960px).
  const origMatch = path.length === 5 && /^(jpe?g|png|gif|webp)$/i.test(path[4].split(".").pop() ?? "") ? path : null;
  const thumbTarget = origMatch
    ? `https://upload.wikimedia.org/${[origMatch[0], origMatch[1], "thumb", origMatch[2], origMatch[3], origMatch[4]].map(encodeURIComponent).join("/")}/960px-${encodeURIComponent(origMatch[4])}`
    : null;

  async function get(url: string): Promise<Response | null> {
    try {
      const r = await fetch(url, { headers: { "User-Agent": USER_AGENT }, next: { revalidate: 86400 } });
      return r.ok && r.body ? r : null;
    } catch {
      return null;
    }
  }
  const upstream = (thumbTarget ? await get(thumbTarget) : null) ?? (await get(target));
  if (!upstream) return new NextResponse("Upstream fetch failed", { status: 502 });

  return new NextResponse(upstream.body, {
    headers: {
      "Content-Type": upstream.headers.get("content-type") ?? "image/jpeg",
      "Cache-Control": "public, max-age=86400, s-maxage=604800, stale-while-revalidate=2592000",
    },
  });
}
