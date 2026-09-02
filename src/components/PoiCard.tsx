"use client";

import Image from "next/image";
import { FavoriteButton } from "@/components/FavoriteButton";
import { CategoryIcon } from "@/components/CategoryIcon";
import { proxiedImageUrl } from "@/lib/imageProxy";

export type PoiCardData = {
  id: string;
  name: string;
  areaName: string;
  categoryName: string;
  categoryColor: string;
  photoUrl: string | null;
  hours?: string | null;
  tags?: string[];
  distanceKm?: number;
};

const STATUS_TAG_MATCH = /vegan|טבעוני|צמחוני|כשר|kosher|halal|חלאל/i;

function statusTag(tags?: string[]): string | null {
  if (!tags || tags.length === 0) return null;
  return tags.find((t) => STATUS_TAG_MATCH.test(t)) ?? tags[0];
}

/** Shared postcard-style POI card — used across the Now screen, favorites,
 * and bookable list so a point of interest always looks the same wherever
 * it's browsed. */
export function PoiCard({
  poi,
  slug,
  favorited,
  onClick,
  scheduled,
  variant = "grid",
}: {
  poi: PoiCardData;
  slug: string;
  favorited: boolean;
  onClick?: () => void;
  /** When defined, shows an "added to itinerary" / "not scheduled yet" pill. */
  scheduled?: boolean;
  variant?: "grid" | "compact";
}) {
  const tag = statusTag(poi.tags);

  if (variant === "compact") {
    return (
      <div
        onClick={onClick}
        className="flex cursor-pointer items-center gap-3 overflow-hidden border p-2 shadow-sm transition-shadow hover:shadow-md"
        style={{ borderRadius: "var(--radius)", borderColor: `color-mix(in srgb, ${poi.categoryColor} 35%, transparent)`, background: "var(--surface)" }}
      >
        {poi.photoUrl ? (
          <Image src={proxiedImageUrl(poi.photoUrl)} alt="" width={56} height={56} className="h-14 w-14 shrink-0 rounded-lg object-cover" loading="lazy" />
        ) : (
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg" style={{ background: `color-mix(in srgb, ${poi.categoryColor} 18%, var(--surface))` }}>
            <CategoryIcon name={poi.categoryName} size={24} />
          </span>
        )}
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-bold">{poi.name}</h3>
          <p className="truncate text-xs opacity-60">
            <CategoryIcon name={poi.categoryName} size={11} /> {poi.categoryName} · {poi.areaName}
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-1">
            {tag && <Badge>{STATUS_TAG_MATCH.test(tag) ? `🌱 ${tag}` : tag}</Badge>}
            {poi.hours && <Badge>🕐 {poi.hours}</Badge>}
            {scheduled !== undefined && <SchedulePill scheduled={scheduled} />}
          </div>
        </div>
        <span onClick={(e) => e.stopPropagation()} className="shrink-0">
          <FavoriteButton poiId={poi.id} slug={slug} initialFavorited={favorited} />
        </span>
      </div>
    );
  }

  return (
    // The tape overhangs the top edge on purpose, so it lives on this
    // outer (non-clipping) wrapper — the inner card below is what actually
    // clips its rounded corners + photo.
    <div onClick={onClick} className="hand-card group relative cursor-pointer">
      <span className="washi-tape" />
      <div
        className="overflow-hidden border shadow-sm transition-shadow hover:z-10 hover:shadow-lg"
        style={{
          borderRadius: "var(--radius)",
          borderColor: `color-mix(in srgb, ${poi.categoryColor} 35%, transparent)`,
          background: "var(--surface)",
        }}
      >
        <div className="relative aspect-[2.5/1] w-full overflow-hidden" style={{ background: `color-mix(in srgb, ${poi.categoryColor} 18%, var(--surface))` }}>
          {poi.photoUrl ? (
            <Image
              src={proxiedImageUrl(poi.photoUrl)}
              alt=""
              fill
              sizes="(max-width: 640px) 50vw, 240px"
              className="object-cover transition-transform group-hover:scale-105"
              loading="lazy"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <span className="flex h-9 w-9 items-center justify-center rounded-full" style={{ background: poi.categoryColor }}>
                <CategoryIcon name={poi.categoryName} size={18} />
              </span>
            </div>
          )}
          <span className="absolute end-1.5 top-1.5" onClick={(e) => e.stopPropagation()}>
            <FavoriteButton poiId={poi.id} slug={slug} initialFavorited={favorited} />
          </span>
          {poi.distanceKm !== undefined && (
            <span className="absolute bottom-1 start-1.5 rounded-full bg-black/60 px-1.5 py-0.5 text-[10px] font-medium text-white">
              {poi.distanceKm.toFixed(1)} ק״מ
            </span>
          )}
        </div>
        <div className="flex flex-col gap-0.5 p-2">
          <h3 className="flex items-center gap-1 truncate text-sm font-bold leading-tight">
            <CategoryIcon name={poi.categoryName} size={12} />
            {poi.name}
          </h3>
          <p className="truncate text-[10px] leading-tight opacity-60">{poi.areaName}</p>
          {(tag || poi.hours || scheduled !== undefined) && (
            <div className="flex flex-wrap items-center gap-1">
              {tag && <Badge>{STATUS_TAG_MATCH.test(tag) ? `🌱 ${tag}` : tag}</Badge>}
              {poi.hours && <Badge>🕐 {poi.hours}</Badge>}
              {scheduled !== undefined && <SchedulePill scheduled={scheduled} />}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span
      className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
      style={{ background: "color-mix(in srgb, var(--primary) 12%, transparent)", color: "var(--text)" }}
    >
      {children}
    </span>
  );
}

function SchedulePill({ scheduled }: { scheduled: boolean }) {
  return (
    <span
      className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
      style={{
        background: scheduled ? "color-mix(in srgb, #22C55E 20%, transparent)" : "color-mix(in srgb, #94A3B8 20%, transparent)",
        color: scheduled ? "#15803D" : "#475569",
      }}
    >
      {scheduled ? "✓ במסלול" : "טרם נקבע במסלול"}
    </span>
  );
}
