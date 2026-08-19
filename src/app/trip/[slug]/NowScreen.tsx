"use client";

import { useMemo, useState } from "react";
import type { FlatPoi } from "@/lib/data/pois";
import { CategoryIcon } from "@/components/CategoryIcon";
import { PoiDetailModal } from "@/components/PoiDetailModal";
import { TodayCard } from "@/components/TodayCard";
import { PoiCard } from "@/components/PoiCard";

type TodayData = {
  destinationId: string;
  destinationName: string;
  heroImage: string | null;
  logisticId: string | null;
  targetDateTimeIso: string | null;
  todayDayItems: { time: string | null; label: string }[] | null;
  bookableItems: { id: string; name: string }[];
};

function haversineKm(a: [number, number], b: [number, number]) {
  const [lat1, lng1] = a;
  const [lat2, lng2] = b;
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

export function NowScreen({
  pois,
  categoryNames,
  slug,
  favoritedIds,
  scheduledPoiIds,
  today,
}: {
  pois: FlatPoi[];
  categoryNames: string[];
  slug: string;
  favoritedIds: Set<string>;
  scheduledPoiIds: Set<string>;
  today: TodayData;
}) {
  const [location, setLocation] = useState<[number, number] | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [requesting, setRequesting] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [detailPoi, setDetailPoi] = useState<FlatPoi | null>(null);

  function requestLocation() {
    setRequesting(true);
    setLocationError(null);
    if (!navigator.geolocation) {
      setLocationError("הדפדפן לא תומך במיקום");
      setRequesting(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation([pos.coords.latitude, pos.coords.longitude]);
        setRequesting(false);
      },
      () => {
        setLocationError("לא הצלחנו לקבל מיקום — עדיין אפשר לעיין בקטגוריות");
        setRequesting(false);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }

  const categorySummary = useMemo(() => {
    const map = new Map<string, { count: number; color: string }>();
    for (const poi of pois) {
      const existing = map.get(poi.categoryName);
      if (existing) existing.count += 1;
      else map.set(poi.categoryName, { count: 1, color: poi.categoryColor });
    }
    return categoryNames.map((name) => ({ name, ...(map.get(name) ?? { count: 0, color: "#888" }) }));
  }, [pois, categoryNames]);

  const activeColor = categorySummary.find((c) => c.name === activeCategory)?.color ?? "var(--primary)";

  const listForCategory = useMemo(() => {
    if (!activeCategory) return [];
    const filtered = pois.filter((p) => p.categoryName === activeCategory);
    if (!location) return filtered;
    return [...filtered]
      .map((p) => ({ ...p, distanceKm: haversineKm(location, [p.lat, p.lng]) }))
      .sort((a, b) => a.distanceKm - b.distanceKm);
  }, [pois, activeCategory, location]);

  return (
    <div className="flex flex-col gap-6">
      <TodayCard
        destinationId={today.destinationId}
        destinationName={today.destinationName}
        heroImage={today.heroImage}
        slug={slug}
        logisticId={today.logisticId}
        targetDateTimeIso={today.targetDateTimeIso}
        todayDayItems={today.todayDayItems}
        bookableItems={today.bookableItems}
      />

      <div
        className="flex flex-col gap-3 border p-4 sm:flex-row sm:items-center sm:justify-between"
        style={{ borderRadius: "var(--radius)", borderColor: "var(--primary)", background: "var(--surface)" }}
      >
        <div>
          <h1 className="text-xl font-bold">מה עכשיו?</h1>
          <p className="text-sm opacity-70">
            {location ? "הרשימות ממוינות לפי קרבה אליכם" : "בחרו קטגוריה, או שתפו מיקום למיון לפי קרבה"}
          </p>
          {locationError && <p className="text-sm text-red-600">{locationError}</p>}
        </div>
        {!location && (
          <button
            onClick={requestLocation}
            disabled={requesting}
            className="rounded-full px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            style={{ background: "var(--primary)" }}
          >
            {requesting ? "מאתר..." : "📍 שתפו מיקום"}
          </button>
        )}
      </div>

      {!activeCategory ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {categorySummary.map((cat, i) => (
            <button
              key={cat.name}
              onClick={() => setActiveCategory(cat.name)}
              className="game-pop-in group flex flex-col items-center gap-2 border p-5 text-center transition-transform hover:-translate-y-1 hover:shadow-md hover:rotate-1"
              style={{
                borderRadius: "var(--radius)",
                borderColor: `color-mix(in srgb, ${cat.color} 30%, transparent)`,
                background: `color-mix(in srgb, ${cat.color} 12%, var(--surface))`,
                animationDelay: `${Math.min(i, 10) * 40}ms`,
              }}
            >
              <span
                className="flex h-16 w-16 items-center justify-center rounded-full shadow-sm transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6"
                style={{ background: cat.color }}
              >
                <CategoryIcon name={cat.name} size={32} />
              </span>
              <span className="font-bold">{cat.name}</span>
              <span className="text-xs opacity-60">{cat.count} נקודות</span>
            </button>
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <button
            onClick={() => setActiveCategory(null)}
            className="self-start text-sm font-semibold opacity-70 hover:opacity-100"
          >
            → חזרה לקטגוריות
          </button>
          <h2 className="flex items-center gap-2 text-lg font-bold">
            <span className="flex h-8 w-8 items-center justify-center rounded-full" style={{ background: activeColor }}>
              <CategoryIcon name={activeCategory} size={16} />
            </span>
            {activeCategory}
          </h2>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6">
            {listForCategory.map((poi) => (
              <PoiCard
                key={poi.id}
                poi={{
                  id: poi.id,
                  name: poi.name,
                  areaName: poi.areaName,
                  categoryName: poi.categoryName,
                  categoryColor: poi.categoryColor,
                  photoUrl: poi.photoUrl,
                  hours: poi.hours,
                  tags: poi.tags,
                  distanceKm: "distanceKm" in poi ? (poi as unknown as { distanceKm: number }).distanceKm : undefined,
                }}
                slug={slug}
                favorited={favoritedIds.has(poi.id)}
                scheduled={scheduledPoiIds.has(poi.id)}
                onClick={() => setDetailPoi(poi)}
              />
            ))}
          </div>
        </div>
      )}

      {detailPoi && <PoiDetailModal poi={detailPoi} onClose={() => setDetailPoi(null)} />}
    </div>
  );
}
