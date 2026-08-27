"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { FlatPoi } from "@/lib/data/pois";
import { CategoryIcon } from "@/components/CategoryIcon";
import { PoiDetailModal } from "@/components/PoiDetailModal";
import { TodayCard } from "@/components/TodayCard";
import { PoiCard } from "@/components/PoiCard";
import { HomeLocalTime } from "@/components/HomeLocalTime";
import { EmergencyInfoButton } from "@/components/EmergencyInfoButton";
import { OnboardingNudge } from "@/components/OnboardingNudge";

type TodayData = {
  destinationId: string;
  destinationName: string;
  heroImage: string | null;
  logisticId: string | null;
  targetDateTimeIso: string | null;
  todayDayItems: { time: string | null; label: string }[] | null;
  bookableItems: { id: string; name: string }[];
  myDestinations: { slug: string; name: string }[];
  showOnboarding: boolean;
};

// Best-effort heuristic — there's no dedicated "indoor" field on a POI, so
// this matches category names against known indoor/outdoor keywords.
// Outdoor keywords win over indoor ones (e.g. an outdoor "shopping street"
// won't get suggested), and a category matching neither is left out
// entirely rather than guessed — a shorter, reliable list beats a longer,
// noisy one for a "it's raining" suggestion.
const INDOOR_HINTS = [
  "מוזיאון", "גלריה", "קניון", "מסעד", "קפה", "בר", "ספא", "תיאטרון", "מועדון",
  "אולם", "שוק מקור", "אקווריום", "פלנטריום", "כנסיי", "מסגד", "ארמון", "קולנוע",
  "מרכז קניות", "בריכה מקורה",
];
const OUTDOOR_HINTS = [
  "פארק", "טבע", "חוף", "טיול רגלי", "שביל", "הרים", "מפל", "יער", "טיילת",
  "נוף", "road trip", "רחוב", "גן ציבורי",
];

function isIndoorFriendly(categoryName: string): boolean {
  if (OUTDOOR_HINTS.some((h) => categoryName.includes(h))) return false;
  return INDOOR_HINTS.some((h) => categoryName.includes(h));
}

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
  const router = useRouter();
  const [location, setLocation] = useState<[number, number] | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [requesting, setRequesting] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [detailPoi, setDetailPoi] = useState<FlatPoi | null>(null);
  const [rainMode, setRainMode] = useState(false);

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
        setLocationError("לא הצלחנו לקבל מיקום - עדיין אפשר לעיין בקטגוריות");
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

  const indoorPois = useMemo(() => {
    const filtered = pois.filter((p) => isIndoorFriendly(p.categoryName));
    if (!location) return filtered;
    return [...filtered]
      .map((p) => ({ ...p, distanceKm: haversineKm(location, [p.lat, p.lng]) }))
      .sort((a, b) => a.distanceKm - b.distanceKm);
  }, [pois, location]);

  return (
    <div className="flex flex-col gap-6">
      {today.showOnboarding && <OnboardingNudge slug={slug} />}
      <TodayCard
        destinationId={today.destinationId}
        destinationName={today.destinationName}
        heroImage={today.heroImage}
        slug={slug}
        logisticId={today.logisticId}
        targetDateTimeIso={today.targetDateTimeIso}
        todayDayItems={today.todayDayItems}
        bookableItems={today.bookableItems}
        myDestinations={today.myDestinations}
      />

      <HomeLocalTime slug={slug} />

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
        <div className="flex shrink-0 gap-2">
          {!location && (
            <button
              onClick={requestLocation}
              disabled={requesting}
              className="rounded-full px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              style={{ background: "var(--primary)" }}
            >
              {requesting ? "מאתר..." : "📍 מיקום"}
            </button>
          )}
          <button
            onClick={() => setRainMode(true)}
            className="rounded-full px-4 py-2 text-sm font-semibold text-white"
            style={{ background: "#0284C7" }}
          >
            🌧️ יורד גשם?
          </button>
          <EmergencyInfoButton slug={slug} destinationName={today.destinationName} />
        </div>
      </div>

      {rainMode && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center" onClick={() => setRainMode(false)}>
          <div
            onClick={(e) => e.stopPropagation()}
            className="flex max-h-[80vh] w-full max-w-md flex-col gap-3 overflow-hidden rounded-2xl p-5"
            style={{ background: "var(--surface)" }}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold">🌧️ מה לעשות כשיורד גשם</h2>
              <button onClick={() => setRainMode(false)} className="text-xl opacity-50 hover:opacity-100" aria-label="סגירה">
                ✕
              </button>
            </div>
            <p className="text-xs opacity-60">הצעות למקומות מקורים ביעד - לחיצה שולחת אתכם למיקום שלהם על המפה.</p>
            <div className="flex flex-1 flex-col gap-2 overflow-y-auto">
              {indoorPois.length === 0 ? (
                <p className="py-4 text-center text-sm opacity-60">לא מצאנו מספיק אטרקציות מקורות ביעד הזה, לצערנו.</p>
              ) : (
                indoorPois.map((poi) => (
                  <button
                    key={poi.id}
                    onClick={() => {
                      setRainMode(false);
                      router.push(`/trip/${slug}?focus=${poi.id}`);
                    }}
                    className="flex items-center justify-between gap-2 rounded-xl border p-3 text-start text-sm transition-colors hover:bg-black/5"
                    style={{ borderColor: "color-mix(in srgb, var(--primary) 20%, transparent)" }}
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: poi.categoryColor }} />
                      <span className="flex min-w-0 flex-col">
                        <span className="truncate font-medium">{poi.name}</span>
                        <span className="truncate text-xs opacity-60">
                          {poi.categoryName} · {poi.areaName}
                          {"distanceKm" in poi && ` · ${(poi as unknown as { distanceKm: number }).distanceKm.toFixed(1)} ק״מ`}
                        </span>
                      </span>
                    </span>
                    <span className="shrink-0 opacity-40">🗺️</span>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}

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

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 lg:grid-cols-5 xl:grid-cols-6">
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
