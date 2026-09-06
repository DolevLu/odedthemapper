"use client";

import { useTransition } from "react";
import { createItineraryDay } from "@/lib/actions/trip";

/** Extracted out of ItineraryTopBar so it can also sit next to the day
 * view's own grid/focused toggle on desktop (see ItineraryDaysView's
 * extraAction) instead of only living in the action toolbar. */
export function AddDayButton({ destinationId, slug }: { destinationId: string; slug: string }) {
  const [, startTransition] = useTransition();

  function handleAddDay() {
    startTransition(() => {
      createItineraryDay(destinationId, slug);
    });
  }

  return (
    <button
      onClick={handleAddDay}
      className="shrink-0 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold text-white"
      style={{ background: "var(--primary)" }}
    >
      + הוספת יום
    </button>
  );
}
