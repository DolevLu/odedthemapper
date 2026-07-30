"use client";

import { useState, useTransition } from "react";
import { togglePackingCheck } from "@/lib/actions/trip";

export function BookingChecklist({
  destinationId,
  slug,
  items,
  checkedKeys,
}: {
  destinationId: string;
  slug: string;
  items: { id: string; name: string }[];
  checkedKeys: Set<string>;
}) {
  const [checked, setChecked] = useState(checkedKeys);
  const [, startTransition] = useTransition();

  if (items.length === 0) return null;

  function toggle(key: string) {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
    startTransition(() => {
      togglePackingCheck(destinationId, key, slug);
    });
  }

  return (
    <section>
      <h2 className="mb-3 text-lg font-bold">🎟️ להזמין לפני הטיול</h2>
      <div className="flex flex-col gap-2">
        {items.map((item) => {
          const key = `booking:${item.id}`;
          return (
            <label
              key={item.id}
              className="flex items-center gap-3 border p-3 text-sm"
              style={{ borderRadius: "var(--radius)", borderColor: "color-mix(in srgb, var(--primary) 25%, transparent)", background: "var(--surface)" }}
            >
              <input type="checkbox" checked={checked.has(key)} onChange={() => toggle(key)} className="h-4 w-4" />
              <span className={checked.has(key) ? "line-through opacity-50" : ""}>{item.name}</span>
            </label>
          );
        })}
      </div>
    </section>
  );
}
