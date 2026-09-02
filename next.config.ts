import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // POI photos come from many sources (Wikipedia, admin uploads, future
    // imports) rather than one fixed host — curated data set only via
    // seeding/admin scripts, never a public user-facing URL field, so a
    // wildcard is safe here. Letting next/image resize and lazy-serve these
    // (instead of the raw <img> full-resolution originals PoiCard/
    // PoiDetailModal used before) is what actually fixes list screens
    // downloading full-size photos for every card just to show a thumbnail.
    remotePatterns: [{ protocol: "https", hostname: "**" }],
    // Wikimedia rejects next/image's own remote fetch outright (429 — its
    // generic User-Agent trips Wikimedia's policy, and next/image never
    // forwards custom headers to a remote src for security reasons), so
    // those specific photos are proxied same-origin through
    // /api/image-proxy/wikimedia/[...path] instead (see lib/imageProxy.ts),
    // which needs no query string (the target is encoded in the path
    // itself). Next 16 requires local image srcs WITH a query string to be
    // explicitly allowed via localPatterns — but configuring localPatterns
    // at all makes it the sole allowlist for every local src, query string
    // or not (confirmed: adding a narrow entry here broke every existing
    // local image, e.g. /hero-prague.jpg, until this line was widened).
    // "/**" with no query string preserves the original default (any local
    // path is fine as long as it has no query string) while still requiring
    // an explicit entry for one that does — nothing here actually needs one.
    localPatterns: [{ pathname: "/**", search: "" }],
  },
  experimental: {
    serverActions: {
      // Default is 1MB, which silently rejected real phone-camera photos
      // (typically 3-10MB) and multi-file album uploads — this is why
      // uploads worked with small desktop test images but failed on mobile.
      bodySizeLimit: "50mb",
    },
    // Every trip screen (Now/Map/Itinerary/...) is a dynamic route (reads
    // the session + does DB queries), so it falls in the "dynamic" client
    // router cache bucket, whose default is 0 seconds — every single tab
    // switch, even hopping right back to a screen visited seconds ago, was
    // discarding the client cache instantly and doing a full server round
    // trip. The underlying data itself is normally already cache-hot
    // server-side (getFlatPoisForDestination and friends are wrapped in
    // unstable_cache with a 1h revalidate), so the round trip was pure
    // wasted network + RSC-render latency, not real DB work. 30s (the
    // pre-Next-15 default) lets quick back-and-forth navigation between
    // screens reuse the client cache instead of re-fetching every time.
    staleTimes: {
      dynamic: 30,
    },
  },
};

export default nextConfig;
