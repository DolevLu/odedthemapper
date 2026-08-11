import type { CapacitorConfig } from "@capacitor/cli";

// This wraps the LIVE production site, not a bundled static build — the app
// uses Next.js Server Actions, Prisma, and NextAuth throughout, none of
// which can run inside a static/offline WebView bundle. The native shell is
// just a real app icon + native chrome (status bar, geolocation permission
// dialog, splash screen) around the same site already deployed at
// travi.odedthemapper.com, the same architecture WhatsApp Web/Twitter/etc.
// use for their "app" wrappers.
const config: CapacitorConfig = {
  appId: "com.odedthemapper.travi",
  appName: "עודד המנקד",
  webDir: "public",
  server: {
    url: "https://travi.odedthemapper.com",
    cleartext: false,
  },
};

export default config;
