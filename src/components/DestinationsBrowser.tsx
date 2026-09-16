"use client";

import { useMemo, useState } from "react";
import { DestinationCard } from "@/components/DestinationCard";
import type { DestinationSummary } from "@/lib/data/destinations";
import { useTranslation } from "@/components/i18n/LanguageContext";
import type { DictionaryKey } from "@/lib/i18n/dictionary";

const CONTINENTS: { key: string; labelKey: DictionaryKey; icon: string }[] = [
  { key: "all", labelKey: "map.all", icon: "🌍" },
  { key: "europe", labelKey: "continent.europe", icon: "🏰" },
  { key: "asia", labelKey: "continent.asia", icon: "🏯" },
  { key: "middle-east", labelKey: "continent.middleEast", icon: "🐫" },
  { key: "africa", labelKey: "continent.africa", icon: "🦁" },
  { key: "americas", labelKey: "continent.americas", icon: "🗽" },
];

export function DestinationsBrowser({ destinations }: { destinations: DestinationSummary[] }) {
  const [continent, setContinent] = useState("all");
  const { t, lang } = useTranslation();

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
            {c.icon} {t(c.labelKey)}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="py-10 text-center opacity-60">{t("destBrowser.noneInContinent")}</p>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((destination) => (
            <DestinationCard key={destination.id} destination={destination} lang={lang} />
          ))}
        </div>
      )}
    </div>
  );
}
