import type { Metadata } from "next";
import { GOOGLE_FONTS_HREF } from "@/lib/theme/fonts";
import { Providers } from "@/components/Providers";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";
import { PortraitOnlyGate } from "@/components/PortraitOnlyGate";
import { PromoDrawer } from "@/components/PromoDrawer";
import { ReferralClaimer } from "@/components/ReferralClaimer";
import { FocusModeExitButton } from "@/components/FocusModeExitButton";
import "./globals.css";

export const metadata: Metadata = {
  title: "עודד המנקד",
  description: "מפות טיולים אינטראקטיביות ומדריכים אישיים לכל יעד",
  manifest: "/manifest.json",
};

export function generateViewport() {
  // viewportFit: "cover" — lets the page draw into the display cutout/status
  // bar area instead of the browser/WebView reserving a plain strip for it.
  // Paired with the native Android edge-to-edge change (MainActivity.java +
  // styles.xml) so the app's own background actually reaches the physical
  // top of the screen instead of a visible OS-colored bar sitting above it;
  // content that shouldn't sit under the notch/status bar uses
  // env(safe-area-inset-top) padding (see AppSidebar's mobile header).
  return { themeColor: "#B5502A", viewportFit: "cover" };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="he" dir="rtl" className="h-full antialiased">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="stylesheet" href={GOOGLE_FONTS_HREF} />
        <link rel="icon" href="/icon.svg" type="image/svg+xml" />
      </head>
      <body className="min-h-full flex flex-col">
        <PortraitOnlyGate />
        <Providers>
          {children}
          <ReferralClaimer />
        </Providers>
        <PromoDrawer />
        <FocusModeExitButton />
        <ServiceWorkerRegister />
      </body>
      {/* No AdSense script here — it needs to be conditional on the viewer
       * NOT being a paying subscriber (see AdSenseScript), which needs a
       * session/subscription lookup. Doing that lookup at the root layout
       * would make genuinely static routes (login, register, privacy,
       * offline, 404 — confirmed via a real before/after build diff) dynamic
       * for every visitor just to decide on an ad script, so it's rendered
       * instead from the two nested layouts that are already dynamic for
       * their own reasons (shell/trip), which is also exactly where a free
       * user actually is when an ad would show. */}
    </html>
  );
}
