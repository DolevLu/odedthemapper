import Script from "next/script";

const ADS_ENABLED = false;

/** Google AdSense's own async loader, shown only to viewers without an
 * active paid plan — the app deliberately does NOT check this at the root
 * layout (see layout.tsx's own comment on why), so this renders instead
 * from each dynamic layout that already knows the viewer's subscription
 * status (shell + trip). strategy="afterInteractive" (the default, stated
 * explicitly) mirrors the snippet's own `async` attribute: non-blocking,
 * loaded once hydration is underway rather than delaying first paint. */
export function AdSenseScript({ show }: { show: boolean }) {
  // 2026-11: NO ads anywhere in the site or app (owner decision) - the AdSense loader is never injected.
  void show;
  if (!ADS_ENABLED) return null;
  return (
    <Script
      async
      src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-5202285396043100"
      crossOrigin="anonymous"
      strategy="afterInteractive"
    />
  );
}
