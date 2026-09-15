"use client";

import { useState } from "react";
import type { TripWrappedStats } from "@/lib/tripWrapped";
import { TripWrappedModal } from "./TripWrappedModal";
import { useTranslation } from "@/components/i18n/LanguageContext";

export function TripWrappedSection({
  trips,
}: {
  trips: { destinationId: string; destinationName: string; flag: string | null; stats: TripWrappedStats }[];
}) {
  const [openId, setOpenId] = useState<string | null>(null);
  const { t } = useTranslation();
  if (trips.length === 0) return null;

  const openTrip = trips.find((trip) => trip.destinationId === openId);

  return (
    <div className="mb-8">
      <h2 className="mb-3 text-xl font-extrabold">{t("account.wrapped.title")}</h2>
      <div className="flex flex-wrap gap-3">
        {trips.map((trip) => (
          <button
            key={trip.destinationId}
            onClick={() => setOpenId(trip.destinationId)}
            className="game-pop-in flex items-center gap-2 rounded-2xl border border-black/5 px-4 py-3 text-start shadow-sm transition-transform hover:-translate-y-1"
            style={{ background: "linear-gradient(135deg, #7C3AED, #EC4899)", color: "white" }}
          >
            <span className="text-xl">{trip.flag ?? "✈️"}</span>
            <span>
              <span className="block text-sm font-bold">{trip.destinationName}</span>
              <span className="block text-xs opacity-80">{t("account.wrapped.viewSummary")}</span>
            </span>
          </button>
        ))}
      </div>

      {openTrip && <TripWrappedModal stats={openTrip.stats} onClose={() => setOpenId(null)} />}
    </div>
  );
}
