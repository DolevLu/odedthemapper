"use client";

import { useState } from "react";
import { deleteLogistic } from "@/lib/actions/trip";
import { LogisticTicketCard, TYPE_META, type LogisticItem } from "./LogisticTicketCard";

export function LogisticsList({ items, slug }: { items: LogisticItem[]; slug: string }) {
  const [filter, setFilter] = useState<string | null>(null);
  const typesPresent = Array.from(new Set(items.map((i) => i.type)));
  const filtered = filter ? items.filter((i) => i.type === filter) : items;

  if (items.length === 0) {
    return <p className="text-sm opacity-60">עדיין לא הוספתם טיסות, מלונות או מסמכים אחרים.</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setFilter(null)}
          className="rounded-full border px-3 py-1 text-xs font-semibold"
          style={{
            borderColor: "var(--primary)",
            background: filter === null ? "var(--primary)" : "transparent",
            color: filter === null ? "white" : "var(--text)",
          }}
        >
          הכל ({items.length})
        </button>
        {typesPresent.map((type) => {
          const meta = TYPE_META[type] ?? TYPE_META.other;
          const count = items.filter((i) => i.type === type).length;
          return (
            <button
              key={type}
              onClick={() => setFilter(type)}
              className="rounded-full border px-3 py-1 text-xs font-semibold"
              style={{
                borderColor: meta.color,
                background: filter === type ? meta.color : "transparent",
                color: filter === type ? "white" : meta.color,
              }}
            >
              {meta.icon} {meta.label} ({count})
            </button>
          );
        })}
      </div>

      <div className="flex flex-col gap-3">
        {filtered.map((item) => (
          <LogisticTicketCard key={item.id} item={item} onDelete={() => deleteLogistic(item.id, slug)} />
        ))}
      </div>
    </div>
  );
}
