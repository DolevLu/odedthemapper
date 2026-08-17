"use client";

import { useState } from "react";
import type { TripWrappedStats } from "@/lib/tripWrapped";
import { TripWrappedModal } from "./TripWrappedModal";

export function TripWrappedSection({
  trips,
}: {
  trips: { destinationId: string; destinationName: string; flag: string | null; stats: TripWrappedStats }[];
}) {
  const [openId, setOpenId] = useState<string | null>(null);
  if (trips.length === 0) return null;

  const openTrip = trips.find((t) => t.destinationId === openId);

  return (
    <div className="mb-8">
      <h2 className="mb-3 text-xl font-extrabold">🎉 סיכומי טיולים</h2>
      <div className="flex flex-wrap gap-3">
        {trips.map((t) => (
          <button
            key={t.destinationId}
            onClick={() => setOpenId(t.destinationId)}
            className="game-pop-in flex items-center gap-2 rounded-2xl border border-black/5 px-4 py-3 text-start shadow-sm transition-transform hover:-translate-y-1"
            style={{ background: "linear-gradient(135deg, #7C3AED, #EC4899)", color: "white" }}
          >
            <span className="text-xl">{t.flag ?? "✈️"}</span>
            <span>
              <span className="block text-sm font-bold">{t.destinationName}</span>
              <span className="block text-xs opacity-80">צפייה בסיכום ←</span>
            </span>
          </button>
        ))}
      </div>

      {openTrip && <TripWrappedModal stats={openTrip.stats} onClose={() => setOpenId(null)} />}
    </div>
  );
}
