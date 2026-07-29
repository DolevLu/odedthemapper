"use client";

import { useMemo, useState } from "react";
import type { FlatPoi } from "@/lib/data/pois";
import { FavoriteButton } from "@/components/FavoriteButton";
import { CategoryIcon } from "@/components/CategoryIcon";
import { PoiDetailModal } from "@/components/PoiDetailModal";

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
}: {
  pois: FlatPoi[];
  categoryNames: string[];
  slug: string;
  favoritedIds: Set<string>;
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
          {categorySummary.map((cat) => (
            <button
              key={cat.name}
              onClick={() => setActiveCategory(cat.name)}
              className="flex flex-col items-start gap-2 border p-4 text-start transition-transform hover:-translate-y-0.5 hover:shadow-md"
              style={{ borderRadius: "var(--radius)", borderColor: "color-mix(in srgb, var(--primary) 25%, transparent)", background: "var(--surface)" }}
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-full" style={{ background: cat.color }}>
                <CategoryIcon name={cat.name} size={16} />
              </span>
              <span className="font-semibold">{cat.name}</span>
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
          <h2 className="text-lg font-bold">{activeCategory}</h2>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {listForCategory.map((poi) => (
              <div
                key={poi.id}
                onClick={() => setDetailPoi(poi)}
                className="flex cursor-pointer flex-col gap-1 border p-4"
                style={{ borderRadius: "var(--radius)", borderColor: "color-mix(in srgb, var(--primary) 30%, transparent)", background: "var(--surface)" }}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs opacity-60">{poi.areaName}</span>
                  <span onClick={(e) => e.stopPropagation()}>
                    <FavoriteButton poiId={poi.id} slug={slug} initialFavorited={favoritedIds.has(poi.id)} />
                  </span>
                </div>
                <h3 className="font-semibold">{poi.name}</h3>
                {"distanceKm" in poi && (
                  <p className="text-xs font-medium" style={{ color: "var(--primary)" }}>
                    {(poi as unknown as { distanceKm: number }).distanceKm.toFixed(1)} ק״מ ממך
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {detailPoi && <PoiDetailModal poi={detailPoi} onClose={() => setDetailPoi(null)} />}
    </div>
  );
}
