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
    <span className="flex items-center gap-2 text-sm font-semibold">
      <span className="text-lg">{info.flag}</span>
      <span>{info.name}</span>
    </span>
  );
}
