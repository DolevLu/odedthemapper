"use client";

import { usePathname } from "next/navigation";

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
export function TripContentArea({ slug, children }: { slug: string; children: React.ReactNode }) {
  const pathname = usePathname();
  const isFullBleed = pathname === `/trip/${slug}` || pathname === `/trip/${slug}/itinerary`;

  return <div className={isFullBleed ? "min-w-0 flex-1" : "min-w-0 flex-1 p-6 pb-32 sm:pb-6"}>{children}</div>;
}
