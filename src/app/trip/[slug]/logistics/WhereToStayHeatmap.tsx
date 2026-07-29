"use client";

import { useEffect, useRef, useState } from "react";
import { useGoogleMaps, loadVisualizationLibrary } from "@/hooks/useGoogleMaps";

export function WhereToStayHeatmap({ points, destinationName }: { points: [number, number][]; destinationName: string }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { loaded } = useGoogleMaps();
  const mapDivRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);

  useEffect(() => {
    if (!open || !loaded || !mapDivRef.current || mapRef.current) return;

    let cancelled = false;
    loadVisualizationLibrary()
      .then(() => {
        if (cancelled || !mapDivRef.current) return;
        const avgLat = points.reduce((s, p) => s + p[0], 0) / (points.length || 1);
        const avgLng = points.reduce((s, p) => s + p[1], 0) / (points.length || 1);

        mapRef.current = new google.maps.Map(mapDivRef.current, {
          center: { lat: avgLat, lng: avgLng },
          zoom: 12,
          streetViewControl: false,
          fullscreenControl: false,
        });

        // The installed @types/google.maps HeatmapLayer typing is stubbed
        // with a zero-arg constructor even though the real runtime API
        // (per Google's docs) takes {data, map, radius} — cast around it.
        const HeatmapLayer = google.maps.visualization.HeatmapLayer as unknown as new (opts: {
          data: google.maps.LatLng[];
          map: google.maps.Map;
          radius: number;
        }) => google.maps.visualization.HeatmapLayer;
        new HeatmapLayer({
          data: points.map(([lat, lng]) => new google.maps.LatLng(lat, lng)),
          map: mapRef.current,
          radius: 28,
        });
      })
      .catch(() => setError("שכבת מפת החום אינה זמינה כרגע"));

    return () => {
      cancelled = true;
    };
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
                  מפת חום לפי צפיפות האטרקציות, המסעדות והברים במערכת שלנו — ריכוזים חמים בדרך כלל אומרים שהאזור תוסס, מהלך הליכה מדברים, ונוח לבסיס לינה.
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
