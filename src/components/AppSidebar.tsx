"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Capacitor } from "@capacitor/core";
import { UpgradeRequired } from "@/components/UpgradeRequired";
import { DiamondIcon } from "@/components/DiamondIcon";
import { FocusModeCollapseButton } from "@/components/FocusModeCollapseButton";
import { ProfileMenu } from "@/components/header/ProfileMenu";
import { DestinationBadge } from "@/components/header/DestinationBadge";
import { TrialCountdown } from "@/components/TrialCountdown";

type Tier = "free" | "silver" | "gold";

const TOP_ITEMS = [
  // Deliberately /home, not "/" — "/" redirects paying users straight to
  // their destination's map (see (shell)/page.tsx), so a Home nav item
  // pointing there would just bounce them right back to the map they're
  // already on with no way to ever reach the real homepage again. /home
  // renders the exact same content with no redirect check.
  { href: "/home", label: "דף הבית", icon: "🏠" },
  { href: "/destinations", label: "יעדים", icon: "🌍" },
  { href: "/trips", label: "הטיולים שלי", icon: "🧳" },
];

const PLAY_STORE_URL = "https://play.google.com/store/apps/details?id=com.odedthemapper.travi";

/** Standalone pill, same size/shape as the "שדרג עכשיו" upgrade CTA — not a
 * plain nav-list row — linking to the Play Store listing. Shown only on the
 * web, since a visitor already inside the native app has no use for a link
 * to install it. */
function DownloadAppLink({ onClick }: { onClick?: () => void }) {
  const [isNativeApp, setIsNativeApp] = useState(true); // default hidden until confirmed web, avoids a flash inside the app
  useEffect(() => setIsNativeApp(Capacitor.isNativePlatform()), []);
  if (isNativeApp) return null;
  return (
    <a
      href={PLAY_STORE_URL}
      target="_blank"
      rel="noopener noreferrer"
      onClick={onClick}
      className="mt-2 flex shrink-0 items-center justify-center gap-2 rounded-full px-4 py-2.5 text-sm font-extrabold text-white shadow-md"
      style={{ background: "linear-gradient(135deg, #7C3AED, #EC4899)" }}
    >
      📲 הורידו את האפליקציה
    </a>
  );
}

/** Small "i" button next to the logo/name — links to the full usage guide
 * (/guide), for anyone who wants the manual rather than the first-login
 * walkthrough (see WalkthroughGuide, which only ever shows once). Filled
 * brand-gradient circle (not just an outlined letter) so it reads as a real
 * button, not stray text next to the logo. */
function GuideInfoButton({ onClick }: { onClick?: () => void }) {
  return (
    <Link
      href="/guide"
      onClick={onClick}
      title="מדריך שימוש"
      aria-label="מדריך שימוש"
      className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full text-[12px] font-bold text-white shadow-sm transition-transform hover:scale-110"
      style={{ background: "linear-gradient(135deg, #7C3AED, #EC4899)", fontFamily: "Georgia, serif" }}
    >
      i
    </Link>
  );
}

/** Blue "פאנל אדמין" shortcut — only ever rendered when isAdmin is true (see
 * the caller), straight to /admin instead of making the site's real admin(s)
 * dig for it via the URL bar. */
function AdminPanelLink({ onClick }: { onClick?: () => void }) {
  return (
    <Link
      href="/admin"
      onClick={onClick}
      className="mt-2 flex shrink-0 items-center justify-center gap-2 rounded-full px-4 py-2.5 text-sm font-extrabold text-white shadow-md"
      style={{ background: "linear-gradient(135deg, #2563EB, #0EA5E9)" }}
    >
      🛠️ פאנל אדמין
    </Link>
  );
}

type DestItem = { href: string; label: string; icon: string; tier: Tier };

// The destination-scoped items pinned in the mobile bottom bar — everything
// else lives behind the hamburger menu. Without a destination context,
// "Destinations" fills one of the pinned slots (there's nothing destination-
// scoped to show yet); once a destination is active (chosen, or a paying
// user's default — see the shell layout), it swaps out for "Itinerary" and
// "Destinations" moves into the hamburger drawer instead.
const MOBILE_PINNED_KEYS_NO_DEST = new Set(["", "/now"]);
const MOBILE_PINNED_KEYS_WITH_DEST = new Set(["", "/now", "/itinerary"]);

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
      { href: "/favorites", label: "מועדפים והטבות", icon: "❤️", tier: "silver" },
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
      { href: "/weather", label: "מזג אוויר", icon: "🌤️", tier: "free" },
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
  name,
  planLabel,
  tierBadge,
  trialEndsAt,
  isAdmin,
}: {
  currentSlug: string | null;
  accessLevel: "none" | "silver" | "gold";
  isLoggedIn: boolean;
  name: string | null;
  planLabel: string | null;
  /** Short English status marker under the logo — FREE / GOLD / DIAMOND /
   * PRO / TRIAL (see tierBadgeForPlanKey). A separate naming scheme from
   * planLabel (the plan's real Hebrew name) and from the "silver"/"gold"
   * AccessLevel gating vocabulary below — just a small badge, not a rename
   * of either. */
  tierBadge?: string;
  /** ISO timestamp the active free trial (see lib/actions/trial.ts) ends at
   * — when set, a live countdown (TrialCountdown) renders instead of the
   * plain tierBadge, since "23:59:41 left" is more useful there than a
   * static "TRIAL" label. */
  trialEndsAt?: string | null;
  /** Site-admin only (User.isAdmin) — deliberately NOT the same as org-tier
   * "gold" access, which also unlocks /admin's content-management tools for
   * paying customers. This surfaces the actual admin dashboard shortcut, so
   * it's restricted to the real site admin(s) only. */
  isAdmin?: boolean;
}) {
  const pathname = usePathname();
  const [lockedTier, setLockedTier] = useState<"silver" | "gold" | "no-destination" | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const mobileNavRef = useRef<HTMLElement>(null);
  // Belt-and-suspenders hard guard for the desktop sidebar (logo/name row +
  // full nav list) on top of its own `hidden sm:flex` Tailwind classes — a
  // user reported that exact row (stretched logo included, consistent with
  // the row rendering unstyled) persistently showing at the top of the
  // native Android app across multiple fresh installs, something CSS
  // media-query hiding alone wasn't preventing there. The native app is by
  // definition always phone-sized, so there's no legitimate case where it
  // should ever show inside it — forcing display:none via inline style
  // (which wins over any stylesheet regardless of whether/when it loaded)
  // removes the ambiguity entirely instead of chasing the CSS timing issue.
  // Defaults to hidden (matches DownloadAppLink's own same-file precedent)
  // to avoid flashing it inside the app before this check resolves.
  const [isNativeApp, setIsNativeApp] = useState(true);
  useEffect(() => setIsNativeApp(Capacitor.isNativePlatform()), []);

  // Publishes the mobile bottom nav's real rendered height as a CSS variable
  // so anything that needs to sit flush against it (the map screen's points
  // list, most notably) can reference the actual height instead of a
  // hardcoded guess that silently drifts out of sync whenever the nav's own
  // content changes.
  useEffect(() => {
    const el = mobileNavRef.current;
    if (!el) return;
    const setVar = () => document.documentElement.style.setProperty("--mobile-nav-height", `${el.offsetHeight}px`);
    setVar();
    const observer = new ResizeObserver(setVar);
    observer.observe(el);
    return () => observer.disconnect();
  }, [currentSlug]);

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

  const hasDestContext = Boolean(currentSlug);
  const pinnedKeys = hasDestContext ? MOBILE_PINNED_KEYS_WITH_DEST : MOBILE_PINNED_KEYS_NO_DEST;
  const pinnedItems = DEST_GROUPS.flatMap((g) => g.items).filter((i) => pinnedKeys.has(i.href));
  const mapItem = pinnedItems.find((i) => i.href === "");
  const nowItem = pinnedItems.find((i) => i.href === "/now");
  const itineraryItem = pinnedItems.find((i) => i.href === "/itinerary");

  return (
    <>
      {/* Desktop sidebar — no separate top header bar anymore (reclaims that
          strip of height for the app itself); the profile button + logo/name
          now live as the sidebar's own first row instead. Home/destinations
          pinned below that, upgrade CTA pinned at bottom, only the
          destination nav groups scroll. */}
      <nav
        className="app-sidebar-desktop hidden shrink-0 flex-col border-e p-3 sm:flex sm:w-64 sm:sticky sm:top-0 sm:h-screen"
        style={{
          borderColor: "color-mix(in srgb, var(--primary, #333) 15%, transparent)",
          background: "var(--background, #FBF6EE)",
          ...(isNativeApp ? { display: "none" } : {}),
        }}
      >
        <div className="mb-3 flex shrink-0 items-center gap-2 px-1">
          <ProfileMenu isLoggedIn={isLoggedIn} name={name} planLabel={planLabel} />
          <Link href="/" className="flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-mark.svg" alt="עודד המנקד" className="h-8 w-8" />
            <span className="flex flex-col leading-tight">
              <span className="text-base font-extrabold">עודד המנקד</span>
              <span className="text-xs font-extrabold" style={{ color: "#F97316" }}>
                טראבי
              </span>
              {trialEndsAt ? (
                <TrialCountdown endsAt={trialEndsAt} />
              ) : (
                tierBadge && <span className="text-[10px] font-bold tracking-wide opacity-50">{tierBadge}</span>
              )}
            </span>
          </Link>
          <GuideInfoButton />
        </div>
        <div className="mb-2 px-1">
          <DestinationBadge />
        </div>

        <div className="mb-1 flex shrink-0 items-center justify-between px-1">
          <span className="text-xs font-bold uppercase tracking-wide opacity-45">תפריט</span>
          <FocusModeCollapseButton />
        </div>

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
                  // A soft tint instead of a solid fill — the old solid
                  // var(--primary) background read as a harsh black block on
                  // the default (non-destination) theme, where --primary and
                  // --text happen to be the same dark brown, so a solid pill
                  // also erased any color contrast with the label text.
                  background: active ? "color-mix(in srgb, var(--primary, #7C3AED) 12%, transparent)" : "transparent",
                  color: "var(--text, #1a1a1a)",
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
          <Link href="/privacy" className="mt-2 block px-4 py-1 text-xs opacity-40 hover:opacity-70">
            מדיניות פרטיות
          </Link>
        </div>

        <Link
          href="/pricing"
          className="mt-3 flex shrink-0 items-center justify-center gap-2 rounded-full px-4 py-2.5 text-sm font-extrabold text-white shadow-md"
          style={{ background: "linear-gradient(135deg, #F59E0B, #EC4899)" }}
        >
          ✨ שדרג עכשיו
        </Link>
        <DownloadAppLink />
        {isAdmin && <AdminPanelLink />}
      </nav>

      {/* Mobile: no top header bar either — the profile button just floats
          in the same spot the header used to place it, with no bar behind
          it, so it doesn't cost any page height. Logo/name move into the
          drawer below instead of sitting in a persistent top strip. */}
      {/* Positioned via inline style, not Tailwind position/inset utility
       * classes — even the physical `right-3` class still put this on the
       * LEFT on a real device/browser combo, so this drops reliance on any
       * generated stylesheet class for the one property that actually
       * matters here. Inline styles apply unconditionally, with no class
       * generation, purging, specificity, or logical-property-resolution
       * question involved at all — there's nothing left to go wrong.
       *
       * Suppressed on the map screen specifically — MapScreen embeds its
       * own copy inline in the right edge of its search bar instead (see
       * its isLoggedIn/name/planLabel props), so this floating one would
       * otherwise be a redundant second profile button stacked right above
       * the first. */}
      {pathname !== `/trip/${currentSlug}` && (
        <div
          className="sm:hidden"
          style={{
            position: "fixed",
            top: "calc(0.75rem + env(safe-area-inset-top))",
            right: "0.75rem",
            zIndex: 40,
          }}
        >
          <ProfileMenu isLoggedIn={isLoggedIn} name={name} planLabel={planLabel} />
        </div>
      )}

      {/* Mobile bottom bar — 5 pinned icons, native-app style */}
      <nav
        ref={mobileNavRef}
        className="fixed inset-x-0 bottom-0 z-30 flex items-stretch justify-around border-t px-1 pb-[env(safe-area-inset-bottom)] shadow-[0_-2px_10px_rgba(0,0,0,0.08)] sm:hidden"
        style={{ borderColor: "color-mix(in srgb, var(--primary, #333) 15%, transparent)", background: "var(--background, #FBF6EE)" }}
      >
        <MobileTab href="/home" icon="🏠" label="דף הבית" active={pathname === "/home"} />
        {!hasDestContext && <MobileTab href="/destinations" icon="🌍" label="יעדים" active={pathname === "/destinations"} />}
        {hasDestContext && nowItem && (
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
        {hasDestContext && itineraryItem && (
          <MobileTab
            href={destHref(itineraryItem)}
            icon={itineraryItem.icon}
            label={itineraryItem.label}
            active={isDestActive(itineraryItem)}
            onClick={(e) => handleDestItemClick(itineraryItem, e)}
          />
        )}
        {!hasDestContext && nowItem && (
          <MobileTab
            href={destHref(nowItem)}
            icon={nowItem.icon}
            label={nowItem.label}
            active={isDestActive(nowItem)}
            onClick={(e) => handleDestItemClick(nowItem, e)}
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
            className="flex w-[80%] max-w-xs flex-col shadow-2xl"
            style={{ background: "var(--background, #FBF6EE)" }}
          >
          {/* Scrollable middle section — everything except the logo/close
           * header and the bottom action buttons, which stay fixed in place
           * (matching the desktop sidebar's own layout: only the nav list
           * scrolls, the upgrade/download/admin buttons never move). */}
          <div className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto p-4" style={{ paddingTop: "calc(1rem + env(safe-area-inset-top))" }}>
            <div className="mb-2 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <GuideInfoButton onClick={() => setDrawerOpen(false)} />
                <Link href="/" onClick={() => setDrawerOpen(false)} className="flex items-center gap-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/logo-mark.svg" alt="עודד המנקד" className="site-logo h-8 w-8" />
                  <span className="text-base font-extrabold">עודד המנקד</span>
                </Link>
              </div>
              <button onClick={() => setDrawerOpen(false)} className="rounded-full px-2 py-1 text-lg opacity-60">
                ✕
              </button>
            </div>
            <div className="mb-2 px-0.5">
              <DestinationBadge />
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
                    background: active ? "color-mix(in srgb, var(--primary, #7C3AED) 12%, transparent)" : "transparent",
                    color: "var(--text, #1a1a1a)",
                  }}
                >
                  <span className="icon-pop text-lg">{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              );
            })}

            <div className="my-1.5 h-px bg-black/10" />

            {DEST_GROUPS.map((group) => {
              const items = group.items.filter((i) => !pinnedKeys.has(i.href));
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
            <Link href="/privacy" onClick={() => setDrawerOpen(false)} className="mt-2 block px-4 py-1 text-xs opacity-40">
              מדיניות פרטיות
            </Link>
          </div>

          <div className="flex shrink-0 flex-col gap-1 p-4 pt-0 pb-[calc(1rem+env(safe-area-inset-bottom))]">
            <Link
              href="/pricing"
              onClick={() => setDrawerOpen(false)}
              className="flex items-center justify-center gap-2 rounded-full px-4 py-2.5 text-sm font-extrabold text-white shadow-md"
              style={{ background: "linear-gradient(135deg, #F59E0B, #EC4899)" }}
            >
              ✨ שדרג עכשיו
            </Link>
            <DownloadAppLink onClick={() => setDrawerOpen(false)} />
            {isAdmin && <AdminPanelLink onClick={() => setDrawerOpen(false)} />}
          </div>
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
    // prefetch (not the default partial prefetch) so these few, always-
    // visible bottom-nav tabs land in the router cache's "static" bucket
    // (5min) instead of "dynamic" (0-30s, see next.config.ts) — the small,
    // fixed set here makes fully prefetching all of them cheap, and it's
    // the primary nav surface on mobile, which is exactly what "switching
    // between screens feels slow" was about.
    <Link
      href={href}
      prefetch
      onClick={onClick}
      className="flex flex-1 flex-col items-center justify-center gap-0.5 py-1.5 text-[11px] font-medium"
      style={{ color: active ? "var(--primary, #7C3AED)" : "var(--text, #1a1a1a)" }}
    >
      <span className={`icon-pop text-xl leading-none ${active ? "game-pop-in" : ""}`}>{icon}</span>
      <span className="max-w-full truncate px-0.5">{label}</span>
    </Link>
  );
}
