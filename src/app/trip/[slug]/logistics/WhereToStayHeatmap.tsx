"use client";

import { useEffect, useRef, useState } from "react";
import { useGoogleMaps } from "@/hooks/useGoogleMaps";
import { buildDensityGrid, colorForIntensity } from "@/lib/heatmap";

const CELL_SIZE_DEG = 0.008; // ~800m grid cells — roughly "neighborhood" scale
const METERS_PER_DEGREE_LAT = 111320;

export function WhereToStayHeatmap({ points, destinationName }: { points: [number, number][]; destinationName: string }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { loaded } = useGoogleMaps();
  const mapDivRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);

  useEffect(() => {
    if (!open || !loaded || !mapDivRef.current || mapRef.current) return;

    try {
      const grid = buildDensityGrid(points, CELL_SIZE_DEG);
      if (grid.length === 0) {
        setError("אין מספיק נתונים כדי להציג מפת צפיפות ליעד הזה");
        return;
      }

      const densest = grid.reduce((max, c) => (c.count > max.count ? c : max), grid[0]);
      const maxCount = densest.count;

      mapRef.current = new google.maps.Map(mapDivRef.current, {
        center: { lat: densest.lat, lng: densest.lng },
        zoom: 13,
        streetViewControl: false,
        fullscreenControl: false,
      });

      const radiusMeters = CELL_SIZE_DEG * METERS_PER_DEGREE_LAT * 0.65;
      grid.forEach((cell) => {
        const intensity = cell.count / maxCount;
        new google.maps.Circle({
          center: { lat: cell.lat, lng: cell.lng },
          radius: radiusMeters,
          map: mapRef.current!,
          strokeWeight: 0,
          fillColor: colorForIntensity(intensity),
          fillOpacity: 0.15 + intensity * 0.45,
        });
      });
    } catch {
      setError("לא הצלחנו להציג את מפת הצפיפות כרגע");
    }
  }, [open, loaded, points]);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="rounded-full border px-4 py-2 text-sm font-semibold"
        style={{ borderColor: "var(--primary)", color: "var(--primary)" }}
      >
        🏙️ איפה כדאי ללון?
      </button>

      {open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4" onClick={() => setOpen(false)}>
          <div
            onClick={(e) => e.stopPropagation()}
            className="flex max-h-[85vh] w-full max-w-2xl flex-col gap-3 overflow-hidden bg-white p-5"
            style={{ borderRadius: "var(--radius)" }}
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <h2 className="text-lg font-bold">איפה כדאי ללון ב{destinationName}?</h2>
                <p className="mt-1 text-xs opacity-60">
                  מפת צפיפות לפי ריכוז האטרקציות, המסעדות והברים במערכת שלנו — אזורים אדומים הם הכי תוססים ונוחים כבסיס לינה.
                </p>
              </div>
              <button onClick={() => setOpen(false)} className="shrink-0 text-lg opacity-60">
                ✕
              </button>
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div ref={mapDivRef} className="h-[420px] w-full" style={{ borderRadius: "var(--radius)", background: "#eee" }} />
          </div>
        </div>
      )}
    </>
  );
}
