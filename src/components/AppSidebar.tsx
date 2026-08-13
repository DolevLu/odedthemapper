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

type DestItem = { href: string; label: string; icon: string; tier: Tier };

// The 4 destination-scoped items pinned in the mobile bottom bar — everything
// else lives behind the hamburger menu. The map is now the trip home (""),
// so the old "/map" pin moved to "/now" for the "what's now" screen.
const MOBILE_PINNED_KEYS = new Set(["", "/now"]);

const DEST_GROUPS: { title: string; items: DestItem[] }[] = [
  {
    title: "תכנון הטיול",
    items: [
      { href: "/now", label: "מה עכשיו", icon: "🧭", tier: "silver" },
      { href: "", label: "מפה", icon: "🗺️", tier: "silver" },
      { href: "/itinerary", label: "מסלול", icon: "📅", tier: "silver" },
    ],
  },
  {
    title: "במהלך הטיול",
    items: [
      { href: "/favorites", label: "מועדפים", icon: "❤️", tier: "silver" },
      { href: "/bookable", label: "להזמנה", icon: "🎟️", tier: "silver" },
      { href: "/logistics", label: "לוגיסטיקה", icon: "✈️", tier: "free" },
      { href: "/expenses", label: "הוצאות", icon: "💸", tier: "free" },
    ],
  },
  {
    title: "כלים ללקוחות",
    items: [
      { href: "/client-planner", label: "תכנון מסלול ללקוח", icon: "🧑‍💼", tier: "gold" },
      { href: "/quotes", label: "CRM", icon: "📄", tier: "gold" },
    ],
  },
  {
    title: "עזרים וזיכרונות",
    items: [
      { href: "/quiz", label: "חידונים", icon: "🧠", tier: "free" },
      { href: "/phrasebook", label: "שיחון", icon: "💬", tier: "free" },
      { href: "/packing", label: "ציוד וצ׳ק ליסט", icon: "🧳", tier: "free" },
      { href: "/album", label: "אלבום", icon: "📸", tier: "free" },
    ],
  },
];

export function AppSidebar({
  currentSlug,
  accessLevel,
  isLoggedIn,
}: {
  currentSlug: string | null;
  accessLevel: "none" | "silver" | "gold";
  isLoggedIn: boolean;
}) {
  const pathname = usePathname();
  const [lockedTier, setLockedTier] = useState<"silver" | "gold" | "no-destination" | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // The map gets a reduced/read-only preview for anonymous visitors (see
  // MapScreen's `preview` prop), so it isn't actually locked for them the
  // way other silver items are — it just quietly degrades instead.
  function isUnlocked(item: DestItem): boolean {
    if (!currentSlug) return false;
    if (item.tier === "free") return true;
    if (!isLoggedIn && item.href === "") return true;
    if (item.tier === "silver") return accessLevel === "silver" || accessLevel === "gold";
    return accessLevel === "gold";
  }

  function handleDestItemClick(item: DestItem, e: React.MouseEvent) {
    if (!isUnlocked(item)) {
      e.preventDefault();
      // Anonymous and logged-in-but-unpaid visitors see the same "upgrade
      // your package" popup (which links to /pricing) — anonymous visitors
      // aren't sent straight to /login, since they need to see what they'd
      // be unlocking before being asked to create an account.
      setLockedTier(!currentSlug ? "no-destination" : (item.tier as "silver" | "gold"));
    } else {
      setDrawerOpen(false);
    }
  }

  function destHref(item: DestItem): string {
    return currentSlug ? `/trip/${currentSlug}${item.href}` : "#";
  }

  function isDestActive(item: DestItem): boolean {
    return (
      Boolean(currentSlug) &&
      (item.href === "" ? pathname === `/trip/${currentSlug}` : pathname.startsWith(`/trip/${currentSlug}${item.href}`))
    );
  }

  const pinnedItems = DEST_GROUPS.flatMap((g) => g.items).filter((i) => MOBILE_PINNED_KEYS.has(i.href));
  const mapItem = pinnedItems.find((i) => i.href === "");
  const nowItem = pinnedItems.find((i) => i.href === "/now");

  return (
    <>
      {/* Desktop sidebar — home/destinations pinned at top, upgrade CTA
          pinned at bottom, only the destination nav groups scroll. */}
      <nav
        className="hidden shrink-0 flex-col border-e p-3 sm:flex sm:w-64 sm:sticky sm:top-[60px] sm:h-[calc(100vh-60px)]"
        style={{ borderColor: "color-mix(in srgb, var(--primary, #333) 15%, transparent)", background: "var(--background, #FBF6EE)" }}
      >
        <div className="flex shrink-0 flex-col gap-1">
          {TOP_ITEMS.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-3 px-4 py-2 text-[15px] font-semibold"
                style={{
                  borderRadius: "999px",
                  background: active ? "var(--primary, #7C3AED)" : "transparent",
                  color: active ? "white" : "var(--text, #1a1a1a)",
                }}
              >
                <span className="icon-pop text-lg">{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>

        <div className="my-1.5 h-px shrink-0 bg-black/10" />

        <div className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto">
          {DEST_GROUPS.map((group) => (
            <div key={group.title} className="contents">
              <p className="mb-1 mt-3 px-4 text-xs font-bold uppercase tracking-wide opacity-45 first:mt-0">{group.title}</p>
              {group.items.map((item) => {
                const active = isDestActive(item);
                const unlocked = isUnlocked(item);
                return (
                  <Link
                    key={item.href}
                    href={destHref(item)}
                    onClick={(e) => handleDestItemClick(item, e)}
                    className="flex items-center gap-2.5 px-4 py-1.5 text-[15px] font-medium"
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
                    <span className="icon-pop">{item.icon}</span>
                    <span className="flex-1">{item.label}</span>
                    {item.tier !== "free" && !unlocked && <DiamondIcon variant={item.tier === "gold" ? "gold" : "blue"} size={13} />}
                  </Link>
                );
              })}
            </div>
          ))}
        </div>

        <Link
          href="/pricing"
          className="mt-3 flex shrink-0 items-center justify-center gap-2 rounded-full px-4 py-2.5 text-sm font-extrabold text-white shadow-md"
          style={{ background: "linear-gradient(135deg, #F59E0B, #EC4899)" }}
        >
          ✨ שדרג עכשיו
        </Link>
      </nav>

      {/* Mobile bottom bar — 5 pinned icons, native-app style */}
      <nav
        className="fixed inset-x-0 bottom-0 z-30 flex items-stretch justify-around border-t px-1 pb-[env(safe-area-inset-bottom)] shadow-[0_-2px_10px_rgba(0,0,0,0.08)] sm:hidden"
        style={{ borderColor: "color-mix(in srgb, var(--primary, #333) 15%, transparent)", background: "var(--background, #FBF6EE)" }}
      >
        <MobileTab href="/" icon="🏠" label="דף הבית" active={pathname === "/"} />
        <MobileTab href="/destinations" icon="🌍" label="יעדים" active={pathname === "/destinations"} />
        {nowItem && (
          <MobileTab
            href={destHref(nowItem)}
            icon={nowItem.icon}
            label={nowItem.label}
            active={isDestActive(nowItem)}
            onClick={(e) => handleDestItemClick(nowItem, e)}
          />
        )}
        {mapItem && (
          <MobileTab
            href={destHref(mapItem)}
            icon={mapItem.icon}
            label={mapItem.label}
            active={isDestActive(mapItem)}
            onClick={(e) => handleDestItemClick(mapItem, e)}
          />
        )}
        <button
          onClick={() => setDrawerOpen(true)}
          className="flex flex-1 flex-col items-center justify-center gap-0.5 py-1.5 text-[11px] font-medium"
          style={{ color: "var(--text, #1a1a1a)" }}
        >
          <span className="text-xl leading-none">☰</span>
          <span>עוד</span>
        </button>
      </nav>

      {/* Mobile slide-out drawer with the rest of the nav, styled like the desktop sidebar */}
      {drawerOpen && (
        <div className="fixed inset-0 z-40 flex sm:hidden" onClick={() => setDrawerOpen(false)}>
          <div className="flex-1 bg-black/40" />
          <div
            onClick={(e) => e.stopPropagation()}
            className="flex w-[80%] max-w-xs flex-col gap-1 overflow-y-auto p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] shadow-2xl"
            style={{ background: "var(--background, #FBF6EE)" }}
          >
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-bold">תפריט</span>
              <button onClick={() => setDrawerOpen(false)} className="rounded-full px-2 py-1 text-lg opacity-60">
                ✕
              </button>
            </div>

            {TOP_ITEMS.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setDrawerOpen(false)}
                  className="flex items-center gap-3 px-4 py-2 text-sm font-semibold"
                  style={{
                    borderRadius: "999px",
                    background: active ? "var(--primary, #7C3AED)" : "transparent",
                    color: active ? "white" : "var(--text, #1a1a1a)",
                  }}
                >
                  <span className="icon-pop text-lg">{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              );
            })}

            <div className="my-1.5 h-px bg-black/10" />

            {DEST_GROUPS.map((group) => {
              const items = group.items.filter((i) => !MOBILE_PINNED_KEYS.has(i.href));
              if (items.length === 0) return null;
              return (
                <div key={group.title} className="contents">
                  <p className="mb-1 mt-3 px-4 text-xs font-bold uppercase tracking-wide opacity-45 first:mt-0">{group.title}</p>
                  {items.map((item) => {
                    const active = isDestActive(item);
                    const unlocked = isUnlocked(item);
                    return (
                      <Link
                        key={item.href}
                        href={destHref(item)}
                        onClick={(e) => handleDestItemClick(item, e)}
                        className="flex items-center gap-2.5 px-4 py-2 text-sm font-medium"
                        style={{
                          borderRadius: "999px",
                          background: active ? "var(--primary, #7C3AED)" : "transparent",
                          color: active ? "white" : unlocked ? "var(--text, #1a1a1a)" : "color-mix(in srgb, var(--text, #1a1a1a) 45%, transparent)",
                        }}
                      >
                        <span className="icon-pop">{item.icon}</span>
                        <span className="flex-1">{item.label}</span>
                        {item.tier !== "free" && !unlocked && <DiamondIcon variant={item.tier === "gold" ? "gold" : "blue"} size={13} />}
                      </Link>
                    );
                  })}
                </div>
              );
            })}

            <Link
              href="/pricing"
              onClick={() => setDrawerOpen(false)}
              className="mt-3 flex items-center justify-center gap-2 rounded-full px-4 py-2.5 text-sm font-extrabold text-white shadow-md"
              style={{ background: "linear-gradient(135deg, #F59E0B, #EC4899)" }}
            >
              ✨ שדרג עכשיו
            </Link>
          </div>
        </div>
      )}

      {lockedTier && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-6" onClick={() => setLockedTier(null)}>
          <div className="relative" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setLockedTier(null)}
              className="absolute -top-3 end-[-0.75rem] flex h-8 w-8 items-center justify-center rounded-full bg-white text-lg shadow-md"
              aria-label="סגירה"
            >
              ✕
            </button>
            {lockedTier === "no-destination" ? (
              <div
                className="mx-auto flex max-w-md flex-col items-center gap-4 border p-8 text-center"
                style={{ borderRadius: "1rem", borderColor: "var(--primary, #7C3AED)", background: "white" }}
              >
                <span className="text-4xl">🌍</span>
                <h2 className="text-lg font-bold">בחרו יעד קודם</h2>
                <p className="text-sm opacity-70">כדי לגשת למסך הזה, בחרו קודם יעד מתוך &quot;יעדים&quot;.</p>
                {/* Also closes the popup on click — AppSidebar lives in the persistent
                 * shell layout, not unmounted on route change, so without this the
                 * popup stayed rendered on top of the destinations page after navigating. */}
                <Link
                  href="/destinations"
                  onClick={() => setLockedTier(null)}
                  className="rounded-full px-6 py-3 font-bold text-white"
                  style={{ background: "linear-gradient(135deg, #7C3AED, #EC4899)" }}
                >
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

function MobileTab({
  href,
  icon,
  label,
  active,
  onClick,
}: {
  href: string;
  icon: string;
  label: string;
  active: boolean;
  onClick?: (e: React.MouseEvent) => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="flex flex-1 flex-col items-center justify-center gap-0.5 py-1.5 text-[11px] font-medium"
      style={{ color: active ? "var(--primary, #7C3AED)" : "var(--text, #1a1a1a)" }}
    >
      <span className={`icon-pop text-xl leading-none ${active ? "game-pop-in" : ""}`}>{icon}</span>
      <span className="max-w-full truncate px-0.5">{label}</span>
    </Link>
  );
}
