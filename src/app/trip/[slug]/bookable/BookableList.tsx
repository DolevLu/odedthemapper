"use client";

import { useState, useTransition } from "react";
import { toggleWantsBooking } from "@/lib/actions/trip";

export type BookablePoi = {
  id: string;
  name: string;
  areaName: string;
  categoryName: string;
  bookingUrl: string | null;
  wantsBooking: boolean;
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
              <Row key={poi.id} poi={poi} onToggle={toggle} />
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
            <Row key={poi.id} poi={poi} onToggle={toggle} />
          ))}
        </div>
      </section>
    </div>
  );
}

function Row({ poi, onToggle }: { poi: BookablePoi; onToggle: (id: string) => void }) {
  return (
    <div
      className="flex items-center justify-between gap-2 border p-3"
      style={{ borderRadius: "var(--radius)", borderColor: "var(--primary)", background: "var(--surface)" }}
    >
      <div>
        <p className="text-sm font-medium">{poi.name}</p>
        <p className="text-xs opacity-60">
          {poi.categoryName} · {poi.areaName}
        </p>
        {poi.bookingUrl && (
          <a href={poi.bookingUrl} target="_blank" rel="noreferrer" className="text-xs underline">
            קישור להזמנה
          </a>
        )}
      </div>
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
  );
}
