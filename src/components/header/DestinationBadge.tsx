"use client";

import { usePathname } from "next/navigation";
import { COUNTRY_BY_SLUG } from "@/lib/countryFlags";

export function DestinationBadge() {
  const pathname = usePathname();
  const match = pathname.match(/^\/trip\/([^/]+)/);
  const slug = match?.[1];
  const info = slug ? COUNTRY_BY_SLUG[slug] : undefined;

  if (!info) return null;

  return (
    <span className="-translate-x-1 flex flex-col items-center gap-0 text-xs font-semibold sm:translate-x-0 sm:flex-row sm:gap-2 sm:text-sm">
      <span className="text-base leading-none sm:text-lg">{info.flag}</span>
      <span className="leading-tight">{info.name}</span>
    </span>
  );
}
