"use client";

import { useEffect, useState } from "react";

// Matches Tailwind's `sm:` breakpoint — used to pick between the mobile
// full-screen-map-with-drawer itinerary layout and the desktop side-by-side
// one at the component level (so only one Google Maps instance ever mounts,
// instead of mounting both and hiding one with CSS — a hidden map container
// can render blank tiles even after becoming visible again).
const BREAKPOINT_PX = 640;

export function useIsDesktop(): boolean {
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia(`(min-width: ${BREAKPOINT_PX}px)`);
    setIsDesktop(mql.matches);
    const listener = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mql.addEventListener("change", listener);
    return () => mql.removeEventListener("change", listener);
  }, []);

  return isDesktop;
}
