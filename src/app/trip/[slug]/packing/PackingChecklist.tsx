"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { togglePackingCheck } from "@/lib/actions/trip";
import { PACKING_LIST, PACKING_CATEGORY_LABELS, type PackingCategory } from "@/lib/packingList";

export function PackingChecklist({
  destinationId,
  slug,
  checkedKeys,
  couponsByPartner,
}: {
  destinationId: string;
  slug: string;
  checkedKeys: Set<string>;
  couponsByPartner: Record<string, { discountDesc: string; url: string | null }>;
}) {
  const [checked, setChecked] = useState(checkedKeys);
  const [, startTransition] = useTransition();

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

  const categories: PackingCategory[] = ["gear", "documents", "before-flight"];
  const doneCount = PACKING_LIST.filter((i) => checked.has(i.key)).length;

  return (
    <div className="flex flex-col gap-8">
      <p className="text-sm opacity-70">
        {doneCount}/{PACKING_LIST.length} סומנו
      </p>
      {categories.map((cat) => (
        <section key={cat}>
          <h2 className="mb-3 text-lg font-bold">{PACKING_CATEGORY_LABELS[cat]}</h2>
          <div className="flex flex-col gap-2">
            {PACKING_LIST.filter((i) => i.category === cat).map((item) => {
              const coupon = item.couponPartner ? couponsByPartner[item.couponPartner] : undefined;
              return (
                <label
                  key={item.key}
                  className="flex items-center justify-between gap-3 border p-3 text-sm"
                  style={{ borderRadius: "var(--radius)", borderColor: "color-mix(in srgb, var(--primary) 25%, transparent)", background: "var(--surface)" }}
                >
                  <span className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={checked.has(item.key)}
                      onChange={() => toggle(item.key)}
                      className="h-4 w-4"
                    />
                    <span className={checked.has(item.key) ? "line-through opacity-50" : ""}>{item.label}</span>
                  </span>
                  {coupon && (
                    <Link href={`/trip/${slug}/favorites`} className="shrink-0 text-xs font-semibold underline" style={{ color: "var(--primary)" }}>
                      יש לנו הנחה 🎁
                    </Link>
                  )}
                </label>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
