"use client";

import { useTransition } from "react";
import { createItineraryDay } from "@/lib/actions/trip";
import { useTranslation } from "@/components/i18n/LanguageContext";

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
      // White background (not the solid --primary fill it used to have) — matching the "שמורים" pill's own
      // outlined-on-white look now that both live in the same action row.
      className="shrink-0 whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-semibold"
      style={{ borderColor: "var(--primary)", color: "var(--primary)", background: "var(--surface)" }}
    >
      {t("itinerary.addDay")}
    </button>
  );
}
