"use client";

import { useEffect, useRef } from "react";

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

/** One AdSense ad slot (created in the AdSense dashboard, identified by
 * `slot`) — the loader script itself is AdSenseScript, shared site-wide;
 * this just renders the <ins> Google's snippet expects and pushes it once
 * the element is in the DOM, same as their own inline snippet does. Safe to
 * push before the loader script has finished loading: `adsbygoogle` is a
 * queue Google's script drains once ready, not something that must exist
 * first. */
export function AdUnit({
  slot,
  format = "auto",
  fullWidthResponsive = false,
  show,
}: {
  slot: string;
  format?: string;
  fullWidthResponsive?: boolean;
  show: boolean;
}) {
  const insRef = useRef<HTMLModElement>(null);

  useEffect(() => {
    if (!show) return;
    const el = insRef.current;
    // Checked against the DOM node itself (not just a React-instance ref) —
    // React's dev-mode Strict Mode remount can otherwise call this twice for
    // what looks like the same slot, which AdSense logs as an error.
    // data-adsbygoogle-status is the attribute Google's own script sets
    // once it's claimed a node, so this is a no-op on the second pass.
    if (!el || el.getAttribute("data-adsbygoogle-status")) return;

    // Pushing before this element has any real width (right on mount, e.g.
    // a narrow/gated screen still laying out) makes AdSense log its own
    // "No slot size for availableWidth=0" and, confirmed live, throw a
    // knock-on React error (#310) shortly after — AdSense mutates this
    // node's DOM outside React's own tree once it (mis-)claims the slot,
    // and a later unrelated re-render trips over that surprise structure.
    // Waiting for a real, non-zero measured width first is the documented
    // fix for the AdSense side of this; it also happens to remove whatever
    // React was reconciling against when it broke.
    let cancelled = false;
    function push() {
      if (cancelled) return;
      try {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
      } catch {
        // Ad blockers routinely throw here — never worth surfacing to the user.
      }
    }
    if (el.offsetWidth > 0) {
      push();
      return;
    }
    const observer = new ResizeObserver((entries) => {
      if (entries[0]?.contentRect.width > 0) {
        observer.disconnect();
        push();
      }
    });
    observer.observe(el);
    // Same fallback AdSense's own docs suggest — don't wait forever for a
    // layout that might never settle to a non-zero width (e.g. a display:
    // none ancestor); push anyway rather than silently never showing an ad.
    const fallback = setTimeout(() => {
      observer.disconnect();
      push();
    }, 2000);
    return () => {
      cancelled = true;
      observer.disconnect();
      clearTimeout(fallback);
    };
  }, [show]);

  if (!show) return null;

  return (
    <ins
      ref={insRef}
      className="adsbygoogle"
      style={{ display: "block" }}
      data-ad-client="ca-pub-5202285396043100"
      data-ad-slot={slot}
      data-ad-format={format}
      data-full-width-responsive={fullWidthResponsive ? "true" : undefined}
    />
  );
}
