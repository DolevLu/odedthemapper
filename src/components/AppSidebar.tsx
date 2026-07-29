"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { UpgradeRequired } from "@/components/UpgradeRequired";
import { DiamondIcon } from "@/components/DiamondIcon";

type Tier = "free" | "silver" | "gold";

const TOP_ITEMS = [
  { href: "/", label: "דף הבית", icon: "🏠" },
  { href: "/destinations", label: "יעדים", icon: "🌍" },
];

const DEST_ITEMS: { href: string; label: string; icon: string; tier: Tier }[] = [
  { href: "", label: "מה עכשיו", icon: "🧭", tier: "silver" },
  { href: "/map", label: "מפה", icon: "🗺️", tier: "silver" },
  { href: "/itinerary", label: "מסלול", icon: "📅", tier: "silver" },
  { href: "/client-planner", label: "תכנון מסלול ללקוח", icon: "🧑‍💼", tier: "gold" },
  { href: "/quotes", label: "הצעת מחיר וחוזים", icon: "📄", tier: "gold" },
  { href: "/favorites", label: "מועדפים", icon: "❤️", tier: "silver" },
  { href: "/bookable", label: "להזמנה", icon: "🎟️", tier: "silver" },
  { href: "/logistics", label: "לוגיסטיקה", icon: "✈️", tier: "free" },
  { href: "/expenses", label: "הוצאות", icon: "💸", tier: "free" },
  { href: "/phrasebook", label: "שיחון", icon: "💬", tier: "free" },
  { href: "/packing", label: "ציוד וצ׳ק ליסט", icon: "🧳", tier: "free" },
  { href: "/gallery", label: "גלריה", icon: "🖼️", tier: "free" },
];

export function AppSidebar({
  currentSlug,
  accessLevel,
}: {
  currentSlug: string | null;
  accessLevel: "none" | "silver" | "gold";
}) {
  const pathname = usePathname();
  const [lockedTier, setLockedTier] = useState<"silver" | "gold" | "no-destination" | null>(null);

  function isUnlocked(tier: Tier): boolean {
    if (!currentSlug) return false;
    if (tier === "free") return true;
    if (tier === "silver") return accessLevel === "silver" || accessLevel === "gold";
    return accessLevel === "gold";
  }

  return (
    <>
      <nav
        className="fixed inset-x-0 bottom-0 z-30 flex flex-col gap-0.5 overflow-x-auto border-t p-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] shadow-[0_-2px_10px_rgba(0,0,0,0.08)] sm:static sm:z-0 sm:w-64 sm:flex-col sm:overflow-visible sm:border-b-0 sm:border-t-0 sm:border-s sm:p-3 sm:pb-3 sm:shadow-none"
        style={{ borderColor: "color-mix(in srgb, var(--primary, #333) 15%, transparent)", background: "var(--background, #FBF6EE)" }}
      >
        <div className="flex flex-row gap-1 overflow-x-auto sm:flex-col sm:overflow-visible">
          {TOP_ITEMS.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex shrink-0 items-center gap-3 px-4 py-2 text-sm font-semibold sm:shrink"
                style={{
                  borderRadius: "999px",
                  background: active ? "var(--primary, #7C3AED)" : "transparent",
                  color: active ? "white" : "var(--text, #1a1a1a)",
                }}
              >
                <span className="text-lg">{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>

        <div className="my-1.5 hidden h-px bg-black/10 sm:block" />

        <div className="flex flex-row gap-1 overflow-x-auto sm:flex-col sm:overflow-visible">
          {DEST_ITEMS.map((item) => {
            const href = currentSlug ? `/trip/${currentSlug}${item.href}` : "#";
            const active = Boolean(currentSlug) && (item.href === "" ? pathname === `/trip/${currentSlug}` : pathname.startsWith(`/trip/${currentSlug}${item.href}`));
            const unlocked = isUnlocked(item.tier);

            return (
              <Link
                key={item.href}
                href={href}
                onClick={(e) => {
                  if (!unlocked) {
                    e.preventDefault();
                    setLockedTier(!currentSlug ? "no-destination" : (item.tier as "silver" | "gold"));
                  }
                }}
                className="flex shrink-0 items-center gap-2.5 px-4 py-1.5 text-sm font-medium sm:shrink"
                style={{
                  borderRadius: "999px",
                  background: active ? "var(--primary, #7C3AED)" : "transparent",
                  color: active ? "white" : unlocked ? "var(--text, #1a1a1a)" : "color-mix(in srgb, var(--text, #1a1a1a) 45%, transparent)",
                }}
                onMouseEnter={(e) => {
                  if (!active) e.currentTarget.style.background = "color-mix(in srgb, var(--primary, #7C3AED) 10%, transparent)";
                }}
                onMouseLeave={(e) => {
                  if (!active) e.currentTarget.style.background = "transparent";
                }}
              >
                <span>{item.icon}</span>
                <span className="flex-1">{item.label}</span>
                {item.tier !== "free" && !unlocked && <DiamondIcon variant={item.tier === "gold" ? "gold" : "blue"} size={13} />}
              </Link>
            );
          })}
        </div>

        <Link
          href="/pricing"
          className="mt-3 flex items-center justify-center gap-2 rounded-full px-4 py-2.5 text-sm font-extrabold text-white shadow-md"
          style={{ background: "linear-gradient(135deg, #F59E0B, #EC4899)" }}
        >
          ✨ שדרג עכשיו
        </Link>
      </nav>

      {lockedTier && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-6" onClick={() => setLockedTier(null)}>
          <div onClick={(e) => e.stopPropagation()}>
            {lockedTier === "no-destination" ? (
              <div
                className="mx-auto flex max-w-md flex-col items-center gap-4 border p-8 text-center"
                style={{ borderRadius: "1rem", borderColor: "var(--primary, #7C3AED)", background: "white" }}
              >
                <span className="text-4xl">🌍</span>
                <h2 className="text-lg font-bold">בחרו יעד קודם</h2>
                <p className="text-sm opacity-70">כדי לגשת למסך הזה, בחרו קודם יעד מתוך &quot;יעדים&quot;.</p>
                <Link href="/destinations" className="rounded-full px-6 py-3 font-bold text-white" style={{ background: "linear-gradient(135deg, #7C3AED, #EC4899)" }}>
                  לבחירת יעד
                </Link>
              </div>
            ) : (
              <UpgradeRequired tier={lockedTier} />
            )}
          </div>
        </div>
      )}
    </>
  );
}
