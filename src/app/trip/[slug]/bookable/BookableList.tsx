"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import { toggleWantsBooking } from "@/lib/actions/trip";
import { CategoryIcon } from "@/components/CategoryIcon";
import { FavoriteButton } from "@/components/FavoriteButton";
import { proxiedImageUrl } from "@/lib/imageProxy";
import { useTranslation } from "@/components/i18n/LanguageContext";

export type BookablePoi = {
  id: string;
  name: string;
  areaName: string;
  categoryName: string;
  categoryColor: string;
  photoUrl: string | null;
  hours: string | null;
  tags: string[];
  bookingUrl: string | null;
  wantsBooking: boolean;
  favorited: boolean;
};

// Above this many items in a single unfiltered category list, cap the
// render so the page doesn't choke on a destination with thousands of POIs
// — picking a category (or a smaller destination) shows everything.
const UNFILTERED_CAP = 60;

export function BookableList({ pois, slug }: { pois: BookablePoi[]; slug: string }) {
  const [items, setItems] = useState(pois);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const { t } = useTranslation();

  function toggle(id: string) {
    setItems((prev) => prev.map((p) => (p.id === id ? { ...p, wantsBooking: !p.wantsBooking } : p)));
    startTransition(() => {
      toggleWantsBooking(id, slug);
    });
  }

  const wanted = items.filter((p) => p.wantsBooking);
  const rest = items.filter((p) => !p.wantsBooking);
  const categoryNames = Array.from(new Set(items.map((p) => p.categoryName))).sort();
  const filteredRest = activeCategory ? rest.filter((p) => p.categoryName === activeCategory) : rest;
  const visibleRest = activeCategory ? filteredRest : filteredRest.slice(0, UNFILTERED_CAP);

  return (
    <div className="flex flex-col gap-6">
      {wanted.length > 0 && (
        <section>
          <h3 className="mb-2 flex items-center gap-2 text-base font-bold">
            {t("bookable.wantToBook")}
            <span className="rounded-full px-2 py-0.5 text-xs text-white" style={{ background: "var(--primary)" }}>
              {wanted.length}
            </span>
          </h3>
          <div className="flex flex-col gap-2 sm:grid sm:grid-cols-2">
            {wanted.map((poi) => (
              <Row key={poi.id} poi={poi} slug={slug} onToggle={toggle} />
            ))}
          </div>
        </section>
      )}

      <section>
        <h3 className="mb-2 text-base font-bold">
          {t("bookable.allAttractions")} <span className="text-sm font-normal opacity-50">({filteredRest.length})</span>
        </h3>
        {categoryNames.length > 1 && (
          <div className="-mx-4 mb-3 flex gap-1.5 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
            <Chip active={activeCategory === null} onClick={() => setActiveCategory(null)}>
              {t("bookable.all")}
            </Chip>
            {categoryNames.map((name) => (
              <Chip key={name} active={activeCategory === name} onClick={() => setActiveCategory(name)}>
                {name}
              </Chip>
            ))}
          </div>
        )}
        {!activeCategory && filteredRest.length > UNFILTERED_CAP && (
          <p className="mb-2 text-xs opacity-50">
            {t("bookable.showingPrefix")} {UNFILTERED_CAP} / {filteredRest.length} {t("bookable.showingSuffix")}
          </p>
        )}
        <div className="flex flex-col gap-2 sm:grid sm:grid-cols-2">
          {visibleRest.map((poi) => (
            <Row key={poi.id} poi={poi} slug={slug} onToggle={toggle} />
          ))}
        </div>
      </section>
    </div>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors"
      style={{
        background: active ? "var(--primary)" : "color-mix(in srgb, var(--primary) 10%, transparent)",
        color: active ? "white" : "var(--text)",
      }}
    >
      {children}
    </button>
  );
}

/** One attraction = one card: photo, what it is, and a single clear action. */
function Row({ poi, slug, onToggle }: { poi: BookablePoi; slug: string; onToggle: (id: string) => void }) {
  const { t } = useTranslation();
  return (
    <div
      className="flex items-center gap-3 border p-2.5 shadow-sm"
      style={{
        borderRadius: "var(--radius)",
        borderColor: poi.wantsBooking ? "var(--primary)" : `color-mix(in srgb, ${poi.categoryColor} 30%, transparent)`,
        background: "var(--surface)",
      }}
    >
      {poi.photoUrl ? (
        <Image src={proxiedImageUrl(poi.photoUrl)} alt="" width={64} height={64} className="h-16 w-16 shrink-0 rounded-xl object-cover" loading="lazy" />
      ) : (
        <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl" style={{ background: `color-mix(in srgb, ${poi.categoryColor} 18%, var(--surface))` }}>
          <CategoryIcon name={poi.categoryName} size={26} />
        </span>
      )}
      <div className="min-w-0 flex-1">
        <h4 className="truncate text-sm font-bold">{poi.name}</h4>
        <p className="truncate text-xs" style={{ color: poi.categoryColor }}>
          {poi.categoryName} <span style={{ color: "var(--text)", opacity: 0.6 }}>· {poi.areaName}</span>
        </p>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
          <button
            onClick={() => onToggle(poi.id)}
            className="rounded-full px-3 py-1 text-xs font-semibold transition-colors"
            style={{
              background: poi.wantsBooking ? "var(--primary)" : "transparent",
              color: poi.wantsBooking ? "white" : "var(--primary)",
              border: "1.5px solid var(--primary)",
            }}
          >
            {poi.wantsBooking ? t("bookable.wantsToBook") : `＋ ${t("bookable.markWantToBook")}`}
          </button>
          {poi.bookingUrl && (
            <a href={poi.bookingUrl} target="_blank" rel="noreferrer" className="text-xs font-semibold underline" style={{ color: "var(--primary)" }}>
              {t("bookable.bookingLink")}
            </a>
          )}
        </div>
      </div>
      <span className="shrink-0 self-start">
        <FavoriteButton poiId={poi.id} slug={slug} initialFavorited={poi.favorited} />
      </span>
    </div>
  );
}
