"use client";

import { usePathname } from "next/navigation";

/** Every trip screen gets consistent padding around its content — except the
 * map, which the user wants edge-to-edge (flush against the header and
 * sidebar, no visible page background around it) rather than floating as a
 * padded card. usePathname (client-only) is what lets this differ per screen
 * without threading the current route through the server layout. */
export function TripContentArea({ slug, children }: { slug: string; children: React.ReactNode }) {
  const pathname = usePathname();
  const isMapScreen = pathname === `/trip/${slug}`;

  return <div className={isMapScreen ? "min-w-0 flex-1" : "min-w-0 flex-1 p-6 pb-32 sm:pb-6"}>{children}</div>;
}
