"use client";

import { useState, useTransition } from "react";
import { toggleWantsBooking } from "@/lib/actions/trip";
import { PoiCard } from "@/components/PoiCard";

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

export function BookableList({ pois, slug }: { pois: BookablePoi[]; slug: string }) {
  const [items, setItems] = useState(pois);
  const [, startTransition] = useTransition();

  function toggle(id: string) {
    setItems((prev) => prev.map((p) => (p.id === id ? { ...p, wantsBooking: !p.wantsBooking } : p)));
    startTransition(() => {
      toggleWantsBooking(id, slug);
    });
  }

  const wanted = items.filter((p) => p.wantsBooking);
  const rest = items.filter((p) => !p.wantsBooking);

  return (
    <div className="flex flex-col gap-8">
      {wanted.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-bold" style={{ fontFamily: "var(--font-heading)" }}>
            רוצים להזמין ({wanted.length})
          </h2>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {wanted.map((poi) => (
              <Row key={poi.id} poi={poi} slug={slug} onToggle={toggle} />
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="mb-3 text-lg font-bold" style={{ fontFamily: "var(--font-heading)" }}>
          כל האטרקציות ({rest.length})
        </h2>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {rest.slice(0, 60).map((poi) => (
            <Row key={poi.id} poi={poi} slug={slug} onToggle={toggle} />
          ))}
        </div>
      </section>
    </div>
  );
}

function Row({ poi, slug, onToggle }: { poi: BookablePoi; slug: string; onToggle: (id: string) => void }) {
  return (
    <div className="flex flex-col gap-2">
      <PoiCard
        variant="compact"
        slug={slug}
        favorited={poi.favorited}
        poi={{
          id: poi.id,
          name: poi.name,
          areaName: poi.areaName,
          categoryName: poi.categoryName,
          categoryColor: poi.categoryColor,
          photoUrl: poi.photoUrl,
          hours: poi.hours,
          tags: poi.tags,
        }}
      />
      <div className="flex items-center justify-between gap-2 ps-1">
        {poi.bookingUrl ? (
          <a href={poi.bookingUrl} target="_blank" rel="noreferrer" className="text-xs underline">
            קישור להזמנה
          </a>
        ) : (
          <span />
        )}
        <button
          onClick={() => onToggle(poi.id)}
          className="shrink-0 rounded-full border px-3 py-1 text-xs font-semibold"
          style={{
            borderRadius: "var(--radius)",
            borderColor: "var(--primary)",
            background: poi.wantsBooking ? "var(--primary)" : "transparent",
            color: poi.wantsBooking ? "white" : "var(--text)",
          }}
        >
          {poi.wantsBooking ? "רוצה להזמין ✓" : "סמנו לרצון הזמנה"}
        </button>
      </div>
    </div>
  );
}
