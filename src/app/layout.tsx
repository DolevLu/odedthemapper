import type { Metadata } from "next";
import { Rubik } from "next/font/google";
import { getLang } from "@/lib/i18n/server";
import { Providers } from "@/components/Providers";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";
import { PortraitOnlyGate } from "@/components/PortraitOnlyGate";
import { PromoDrawer } from "@/components/PromoDrawer";
import { ReferralClaimer } from "@/components/ReferralClaimer";
import { FocusModeExitButton } from "@/components/FocusModeExitButton";
import "./globals.css";

// Self-hosted (built at compile time, served from our own domain) instead of the old <link> to
// fonts.googleapis.com — that was a render-blocking round trip (DNS + TLS + download to a third-party host) on
// every cold app launch, before the very first paint could happen. This removes it entirely: the font files ship
// as part of our own static assets, cached by the WebView exactly like every other app asset.
const rubik = Rubik({ subsets: ["latin", "hebrew"], weight: ["400", "500", "600", "700", "800"], display: "swap", variable: "--font-rubik" });

export const metadata: Metadata = {
  title: "טראבי",
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
  //
  // interactiveWidget: "resizes-content" was tried here for the keyboard-gap
  // bug and reverted the same day — right after it shipped, "This page
  // couldn't load" started showing up site-wide (app, mobile browser, AND
  // desktop web), which strongly implicates it: a viewport/metadata value
  // that throws during Next's static metadata resolution bypasses the
  // normal component-tree error boundary (error.tsx) entirely, which fits
  // a failure this broad appearing on every surface at once. Not fully
  // confirmed, but not worth the risk of re-adding without being sure.
  return { themeColor: "#7C3AED", viewportFit: "cover" };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Read once, here, and threaded down through Providers to LanguageProvider
  // as its React state's OWN initial value — not just used to pick server-
  // rendered text elsewhere. See LanguageContext.tsx's own comment: this is
  // the actual fix for a reproducible "This page couldn't load" (React error
  // #418, an unrecoverable hydration mismatch) hitting every navigation for
  // anyone whose "lang" cookie says "en", confirmed from a real console
  // screenshot.
  const initialLang = await getLang();
  return (
    // suppressHydrationWarning: the theme-init script below sets data-theme
    // (and this element's own font-size) from localStorage before React
    // hydrates, so the server-rendered markup never has them — an expected,
    // deliberate mismatch on this one element, not a real bug to warn about.
    <html
      lang="he"
      dir="rtl"
      className={`h-full antialiased ${rubik.variable}`}
      // Highest-specificity way to point the site's existing --font-heading/--font-body/--font-display-latin
      // tokens (globals.css) at the self-hosted font without depending on cascade order between this and that
      // stylesheet - inline style on the element always wins for a property set on that same element.
      style={{ "--font-heading": "var(--font-rubik), sans-serif", "--font-body": "var(--font-rubik), sans-serif", "--font-display-latin": "var(--font-rubik), sans-serif" } as React.CSSProperties}
      suppressHydrationWarning
    >
      <head>
        <link rel="icon" href="/icon.svg" type="image/svg+xml" />
        {/* The map screen (Google Maps JS SDK + tiles) is what the app opens to by default, right after this first
         * paint — warming the connection to its two hosts here (instead of only starting it once useGoogleMaps'
         * <script> tag itself gets inserted) overlaps that DNS+TLS handshake with everything else the launch is
         * already doing, so the map script itself starts transferring sooner. */}
        <link rel="preconnect" href="https://maps.googleapis.com" />
        <link rel="preconnect" href="https://maps.gstatic.com" crossOrigin="anonymous" />
        {/* Applies the saved theme/font-size preference (see SettingsModal)
         * before first paint — a synchronous head script runs and blocks
         * rendering before any CSS/hydration, which is what avoids a
         * flash-of-wrong-theme that setting these from a React effect would
         * cause. No DB/auth lookup, so this doesn't affect this layout's
         * static-route status (see the AdSense comment below for why that
         * matters here).
         *
         * "system" (default and explicit) deliberately does NOT follow the
         * device's prefers-color-scheme right now — confirmed live: a visitor
         * whose OS/browser is in dark mode got a half-finished dark theme
         * (some sections' hardcoded light backgrounds left their text
         * unreadably faint against a now-dark surface), on the marketing
         * home page and elsewhere, logged in or not. Until dark mode gets a
         * real pass across every screen, everyone sees the light theme
         * unless they explicitly pick "כהה" in Settings — that stays honored
         * below, since it's a deliberate opt-in rather than a silent OS
         * side-effect. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem("theme")||"light";document.documentElement.dataset.theme=t==="dark"?"dark":"light";var f=localStorage.getItem("fontScale");if(f)document.documentElement.style.fontSize=f;var l=localStorage.getItem("lang");if(l==="en"){document.documentElement.lang="en";document.documentElement.dir="ltr";document.cookie="lang=en; path=/; max-age=31536000; SameSite=Lax";}}catch(e){}`,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col">
        <PortraitOnlyGate />
        <Providers initialLang={initialLang}>
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
