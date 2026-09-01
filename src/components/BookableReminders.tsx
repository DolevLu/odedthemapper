"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { togglePackingCheck } from "@/lib/actions/trip";

/** Keeps a title to at most two words so two cards fit per row instead of
 * one full-width row each — this section is meant to be a quick glance-and-
 * go list, not a long scroll. */
function shortTitle(name: string): string {
  const words = name.trim().split(/\s+/);
  return words.length <= 2 ? name : `${words.slice(0, 2).join(" ")}…`;
}

export function BookableReminders({
  destinationId,
  slug,
  bookableItems,
}: {
  destinationId: string;
  slug: string;
  bookableItems: { id: string; name: string }[];
}) {
  const [handledIds, setHandledIds] = useState<Set<string>>(new Set());
  const [, startTransition] = useTransition();

  /** Both outcomes remove the item from THIS user's own list — "booked" and
   * "not interested" both just mean "stop showing me this," they just log
   * different itemKeys so a real checklist (packing screen) can still tell
   * the difference. wantsBooking itself is shared across every traveler on
   * the destination, so neither button touches it — see now/page.tsx. */
  function markHandled(poiId: string, kind: "booked" | "dismissed") {
    setHandledIds((s) => new Set(s).add(poiId));
    startTransition(() => {
      togglePackingCheck(destinationId, kind === "booked" ? `booking:${poiId}` : `booking-dismissed:${poiId}`, slug);
    });
  }

  const visible = bookableItems.filter((item) => !handledIds.has(item.id));
  if (visible.length === 0) return null;

  return (
    <section>
      <h2 className="mb-2 text-sm font-bold">🎟️ לזכור להזמין</h2>
      <div className="grid grid-cols-2 gap-1.5">
        {visible.map((item) => (
          <div
            key={item.id}
            className="flex items-center justify-between gap-1.5 border px-2 py-1.5 text-xs"
            style={{ borderRadius: "var(--radius)", borderColor: "color-mix(in srgb, var(--primary) 25%, transparent)", background: "var(--surface)" }}
          >
            <span className="min-w-0 truncate" title={item.name}>
              {shortTitle(item.name)}
            </span>
            <span className="flex shrink-0 items-center gap-1">
              <button
                onClick={() => markHandled(item.id, "booked")}
                aria-label="הוזמן"
                title="הוזמן"
                className="flex h-4 w-4 items-center justify-center rounded-full border text-[9px] font-bold"
                style={{ borderColor: "var(--text)", color: "var(--text)" }}
              >
                ✓
              </button>
              <button
                onClick={() => markHandled(item.id, "dismissed")}
                aria-label="לא מעוניין/ת"
                title="לא מעוניין/ת"
                className="flex h-4 w-4 items-center justify-center rounded-full border text-[9px] font-bold"
                style={{ borderColor: "var(--text)", color: "var(--text)", opacity: 0.6 }}
              >
                ✗
              </button>
            </span>
          </div>
        ))}
      </div>
      <Link href={`/trip/${slug}/packing`} className="mt-1.5 inline-block text-xs underline opacity-60">
        לצ׳ק ליסט המלא ←
      </Link>
    </section>
  );
}
