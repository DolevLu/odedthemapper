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
