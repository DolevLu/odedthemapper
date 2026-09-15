"use client";

import { useTransition } from "react";
import { createItineraryDay } from "@/lib/actions/trip";
import { useTranslation } from "@/components/i18n/LanguageContext";

/** Extracted out of ItineraryTopBar so it can also sit next to the day
 * view's own grid/focused toggle on desktop (see ItineraryDaysView's
 * extraAction) instead of only living in the action toolbar. */
export function AddDayButton({ destinationId, slug }: { destinationId: string; slug: string }) {
  const [, startTransition] = useTransition();
  const { t } = useTranslation();

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
      {t("itinerary.addDay")}
    </button>
  );
}
