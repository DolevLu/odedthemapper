"use client";

import { usePathname } from "next/navigation";
import { AdUnit } from "@/components/AdUnit";

/** Every trip screen gets consistent padding around its content — except the
 * map (and, once it has days to show, the itinerary's desktop side-panel+map
 * view), which the user wants edge-to-edge (flush against the header and
 * sidebar, no visible page background around it) rather than floating as a
 * padded card. usePathname (client-only) is what lets this differ per screen
 * without threading the current route through the server layout.
 *
 * The itinerary page itself still needs padding for its own onboarding state
 * (no days yet — just the title/wizard, a normal in-flow page) — it applies
 * that padding internally now that this wrapper doesn't, rather than this
 * component trying to know about server-side itinerary state. */
export function TripContentArea({
  slug,
  showAds,
  children,
}: {
  slug: string;
  /** Free/anonymous/trial viewers only (see shouldShowAds in lib/access.ts). */
  showAds: boolean;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isFullBleed = pathname === `/trip/${slug}` || pathname === `/trip/${slug}/itinerary`;

  // Skipped on the full-bleed map/itinerary screens — those are fixed,
  // edge-to-edge app views with no natural "end of the page" to put a
  // banner at, unlike every other trip screen, which is a normal scrollable
  // page. re-keyed on pathname so navigating between two of those screens
  // remounts the ad (a fresh <ins> per page, matching how a real page load
  // would behave) instead of one stale instance reused across routes.
  if (isFullBleed) return <div className="min-w-0 flex-1">{children}</div>;

  return (
    <div className="min-w-0 flex-1 p-6 pb-32 sm:pb-6">
      {children}
      <div className="mt-8">
        <AdUnit key={pathname} slot="6290998567" format="auto" fullWidthResponsive show={showAds} />
      </div>
    </div>
  );
}
