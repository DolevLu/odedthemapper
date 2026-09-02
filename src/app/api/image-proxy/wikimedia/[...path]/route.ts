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

  let upstream: Response;
  try {
    upstream = await fetch(target, { headers: { "User-Agent": USER_AGENT }, next: { revalidate: 86400 } });
  } catch {
    return new NextResponse("Upstream fetch failed", { status: 502 });
  }
  if (!upstream.ok || !upstream.body) {
    return new NextResponse("Upstream fetch failed", { status: 502 });
  }

  return new NextResponse(upstream.body, {
    headers: {
      "Content-Type": upstream.headers.get("content-type") ?? "image/jpeg",
      "Cache-Control": "public, max-age=86400, s-maxage=604800, stale-while-revalidate=2592000",
    },
  });
}
