"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";

const SHOW_AFTER_MS = 60_000;
const DISMISSED_KEY = "travi_promo_dismissed";
const PROMO_CODE = "TRAVI15";

/** A one-time-per-session discount nudge — slides up from the bottom once
 * someone's been in the app for a minute, not immediately on load. Skipped
 * on the checkout flow itself, where a promo code field is already visible. */
export function PromoDrawer() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem(DISMISSED_KEY)) return;
    const timer = setTimeout(() => setVisible(true), SHOW_AFTER_MS);
    return () => clearTimeout(timer);
  }, []);

  function dismiss() {
    setVisible(false);
    sessionStorage.setItem(DISMISSED_KEY, "1");
  }

  function copyCode() {
    navigator.clipboard.writeText(PROMO_CODE).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  if (!visible || pathname?.startsWith("/subscribe")) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 flex justify-center px-3 pb-3 sm:px-6 sm:pb-6" style={{ animation: "travi-promo-up 0.35s ease-out" }}>
      <style>{`@keyframes travi-promo-up { from { transform: translateY(100%); opacity: 0; } to { transform: translateY(0); opacity: 1; } }`}</style>
      <div
        className="relative flex w-full max-w-md flex-wrap items-center gap-3 rounded-2xl border border-black/5 bg-white p-4 shadow-2xl sm:flex-nowrap"
        dir="rtl"
      >
        <button
          onClick={dismiss}
          className="absolute end-2 top-2 flex h-6 w-6 items-center justify-center rounded-full text-sm opacity-50 hover:opacity-100"
          aria-label="סגירה"
        >
          ✕
        </button>
        <span className="text-3xl">🎁</span>
        <div className="min-w-0 flex-1 pe-5">
          <p className="font-bold">15% הנחה על כל חבילה!</p>
          <p className="text-sm opacity-70">
            השתמשו בקוד{" "}
            <button onClick={copyCode} className="rounded-full px-2 py-0.5 font-mono font-bold text-white" style={{ background: "#7C3AED" }}>
              {copied ? "✓ הועתק" : PROMO_CODE}
            </button>{" "}
            בתשלום
          </p>
        </div>
        <Link
          href="/pricing"
          onClick={dismiss}
          className="shrink-0 rounded-full px-4 py-2 text-sm font-bold text-white"
          style={{ background: "linear-gradient(135deg, #7C3AED, #EC4899)" }}
        >
          לתוכניות ←
        </Link>
      </div>
    </div>
  );
}
