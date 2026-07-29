"use client";

import { useMemo, useState } from "react";
import { DestinationCard } from "@/components/DestinationCard";
import type { DestinationSummary } from "@/lib/data/destinations";

const CONTINENTS: { key: string; label: string }[] = [
  { key: "all", label: "🌍 הכל" },
  { key: "europe", label: "🏰 אירופה" },
  { key: "asia", label: "🏯 אסיה" },
  { key: "middle-east", label: "🐫 המזרח התיכון" },
  { key: "africa", label: "🦁 אפריקה" },
  { key: "americas", label: "🗽 אמריקה" },
];

export function DestinationsBrowser({ destinations }: { destinations: DestinationSummary[] }) {
  const [continent, setContinent] = useState("all");

  const filtered = useMemo(() => {
    const list = continent === "all" ? destinations : destinations.filter((d) => d.continent === continent);
    const live = list.filter((d) => d.status !== "draft");
    const comingSoon = list.filter((d) => d.status === "draft");
    return [...live, ...comingSoon];
  }, [destinations, continent]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap gap-2">
        {CONTINENTS.map((c) => (
          <button
            key={c.key}
            onClick={() => setContinent(c.key)}
            className="rounded-full px-4 py-2 text-sm font-semibold transition-colors"
            style={{
              background: continent === c.key ? "linear-gradient(135deg, #7C3AED, #EC4899)" : "white",
              color: continent === c.key ? "white" : "#1a1a1a",
              border: continent === c.key ? "none" : "1px solid rgba(0,0,0,0.1)",
            }}
          >
            {c.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="py-10 text-center opacity-60">אין עדיין יעדים ביבשת הזו.</p>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((destination) => (
            <DestinationCard key={destination.id} destination={destination} />
          ))}
        </div>
      )}
    </div>
  );
}
