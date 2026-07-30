import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
