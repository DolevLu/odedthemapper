"use client";

import { useEffect, useState } from "react";
import { reorderItineraryDay, removeItineraryItem } from "@/lib/actions/trip";

export type DayListItem = {
  id: string;
  timeOfDay: string | null;
  customLabel: string | null;
  poi: { name: string; photoUrl: string | null } | null;
};

export function DayItemsList({
  dayId,
  slug,
  items,
  path = "itinerary",
}: {
  dayId: string;
  slug: string;
  items: DayListItem[];
  path?: string;
}) {
  const [order, setOrder] = useState(() => items.map((i) => i.id));
  const [dragId, setDragId] = useState<string | null>(null);

  useEffect(() => {
    setOrder((prev) => {
      const ids = items.map((i) => i.id);
      const same = prev.length === ids.length && prev.every((id, i) => id === ids[i]);
      return same ? prev : ids;
    });
  }, [items]);

  const byId = new Map(items.map((i) => [i.id, i]));
  const ordered = order.map((id) => byId.get(id)).filter((i): i is DayListItem => Boolean(i));

  function handleDrop(targetId: string) {
    if (!dragId || dragId === targetId) return;
    const next = order.filter((id) => id !== dragId);
    const targetIndex = next.indexOf(targetId);
    next.splice(targetIndex, 0, dragId);
    setOrder(next);
    setDragId(null);
    reorderItineraryDay(dayId, next, slug, path);
  }

  if (items.length === 0) return <p className="text-xs opacity-50">אין עדיין נקודות ביום הזה.</p>;

  return (
    <div className="flex flex-col gap-2">
      {ordered.map((item) => (
        <div
          key={item.id}
          draggable
          onDragStart={() => setDragId(item.id)}
          onDragOver={(e) => e.preventDefault()}
          onDrop={() => handleDrop(item.id)}
          className="flex cursor-grab items-center gap-3 rounded-lg border px-3 py-2 text-sm active:cursor-grabbing"
          style={{
            borderColor: "color-mix(in srgb, var(--primary) 25%, transparent)",
            opacity: dragId === item.id ? 0.5 : 1,
          }}
        >
          <span className="opacity-40" aria-hidden>
            ⠿
          </span>
          {item.poi?.photoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={item.poi.photoUrl} alt="" className="h-10 w-10 shrink-0 rounded-lg object-cover" />
          )}
          <span className="flex-1">
            {item.timeOfDay && <span className="me-2 font-mono text-xs opacity-70">{item.timeOfDay}</span>}
            {item.poi ? item.poi.name : item.customLabel}
            {!item.poi && <span className="ms-2 text-xs opacity-50">(פריט חופשי)</span>}
          </span>
          <form action={removeItineraryItem.bind(null, item.id, slug)}>
            <button className="opacity-50 hover:opacity-100">✕</button>
          </form>
        </div>
      ))}
    </div>
  );
}
