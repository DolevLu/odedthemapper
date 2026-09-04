import type { Metadata } from "next";
import Script from "next/script";
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
      {/* Google AdSense — loaded once here in the root layout so every route
       * in the app gets it, per next/script's own "Application Scripts"
       * guidance (a hand-placed <script> in <head> the way AdSense's own
       * setup instructions describe is the pages-router/plain-HTML idiom;
       * this is the App Router equivalent — Next places and dedupes the
       * actual tag itself, regardless of where in the JSX it's written).
       * strategy="afterInteractive" (the default, stated explicitly) mirrors
       * the snippet's own `async` attribute: non-blocking, loaded once
       * hydration is underway rather than delaying first paint. */}
      <Script
        async
        src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-5202285396043100"
        crossOrigin="anonymous"
        strategy="afterInteractive"
      />
    </html>
  );
}
