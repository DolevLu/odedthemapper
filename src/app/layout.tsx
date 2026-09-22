import type { Metadata } from "next";
import { GOOGLE_FONTS_HREF } from "@/lib/theme/fonts";
import { getLang } from "@/lib/i18n/server";
import { Providers } from "@/components/Providers";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";
import { PortraitOnlyGate } from "@/components/PortraitOnlyGate";
import { PromoDrawer } from "@/components/PromoDrawer";
import { ReferralClaimer } from "@/components/ReferralClaimer";
import { FocusModeExitButton } from "@/components/FocusModeExitButton";
import "./globals.css";

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
    <html lang="he" dir="rtl" className="h-full antialiased" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="stylesheet" href={GOOGLE_FONTS_HREF} />
        <link rel="icon" href="/icon.svg" type="image/svg+xml" />
        {/* Applies the saved theme/font-size preference (see SettingsModal)
         * before first paint — a synchronous head script runs and blocks
         * rendering before any CSS/hydration, which is what avoids a
         * flash-of-wrong-theme that setting these from a React effect would
         * cause. No DB/auth lookup, so this doesn't affect this layout's
         * static-route status (see the AdSense comment below for why that
         * matters here). */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem("theme")||"system";document.documentElement.dataset.theme=t==="system"?(matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"):t;var f=localStorage.getItem("fontScale");if(f)document.documentElement.style.fontSize=f;var l=localStorage.getItem("lang");if(l==="en"){document.documentElement.lang="en";document.documentElement.dir="ltr";document.cookie="lang=en; path=/; max-age=31536000; SameSite=Lax";}}catch(e){}`,
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
