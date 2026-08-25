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
  },
};

export default nextConfig;
