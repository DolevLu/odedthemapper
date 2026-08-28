"use client";

import { useEffect, useRef } from "react";
import { useGoogleMaps } from "@/hooks/useGoogleMaps";

/** Read-only replay of everywhere this user's GPS actually recorded them
 * during this trip (LocationPing) — the "פיזית איפה הלכתי" piece of the
 * trip archive. No controls, no live tracking, no markers beyond the path
 * itself — this is a memory, not a tool. */
export function TripTrailMap({ points }: { points: { lat: number; lng: number }[] }) {
  const { loaded } = useGoogleMaps();
  const mapDivRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);

  useEffect(() => {
    if (!loaded || !mapDivRef.current || mapRef.current || points.length === 0) return;

    mapRef.current = new google.maps.Map(mapDivRef.current, {
      center: points[Math.floor(points.length / 2)],
      zoom: 13,
      streetViewControl: false,
      fullscreenControl: false,
      mapTypeControl: false,
    });

    new google.maps.Polyline({
      path: points,
      map: mapRef.current,
      strokeColor: "#7C3AED",
      strokeWeight: 4,
      strokeOpacity: 0.8,
    });

    const bounds = new google.maps.LatLngBounds();
    points.forEach((p) => bounds.extend(p));
    mapRef.current.fitBounds(bounds, 32);
  }, [loaded, points]);

  if (points.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-black/10 p-4 text-center text-sm opacity-60">
        לא נאספו נתוני מיקום בטיול הזה - אפשר להפעיל שיתוף מיקום במפה כדי לתעד את המסלול הפיזי בפעם הבאה.
      </p>
    );
  }

  return <div ref={mapDivRef} className="h-[320px] w-full" style={{ borderRadius: "var(--radius)", background: "#eee" }} />;
}
