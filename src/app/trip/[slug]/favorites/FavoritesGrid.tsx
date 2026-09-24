"use client";

import { useRouter } from "next/navigation";
import { PoiCard, type PoiCardData } from "@/components/PoiCard";

/** Favorites as cards; a tap opens that place on the map (same ?focus= deep link the Now screen uses). */
export function FavoritesGrid({ slug, pois }: { slug: string; pois: PoiCardData[] }) {
  const router = useRouter();
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 lg:grid-cols-5 xl:grid-cols-6">
      {pois.map((poi) => (
        <PoiCard key={poi.id} poi={poi} slug={slug} favorited onClick={() => router.push(`/trip/${slug}?focus=${poi.id}`)} />
      ))}
    </div>
  );
}
