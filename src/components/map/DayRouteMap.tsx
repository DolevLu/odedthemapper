"use client";

import { useEffect, useRef } from "react";
import { useGoogleMaps } from "@/hooks/useGoogleMaps";
import { colorForDay } from "@/lib/geo";
import { DECLUTTERED_MAP_STYLES } from "@/lib/mapStyles";

export type MapDay = {
  dayIndex: number;
  points: { id: string; name: string; lat: number; lng: number; description?: string | null; photoUrl?: string | null }[];
};

function infoWindowHtml(p: MapDay["points"][number]): string {
  const photo = p.photoUrl
    ? `<img src="${p.photoUrl}" alt="" style="width:200px;height:110px;object-fit:cover;border-radius:8px;margin-bottom:6px" />`
    : "";
  const description = p.description
    ? `<div style="font-size:12px;opacity:.75;margin-top:4px;max-width:200px">${p.description.slice(0, 200)}</div>`
    : "";
  return `<div style="font-family:'Rubik',sans-serif;padding:2px 4px">${photo}<strong>${p.name}</strong>${description}</div>`;
}

export function DayRouteMap({ days }: { days: MapDay[] }) {
  const { loaded, error } = useGoogleMaps();
  const mapDivRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const overlaysRef = useRef<(google.maps.Marker | google.maps.Polyline)[]>([]);
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);

  useEffect(() => {
    if (!loaded || !mapDivRef.current) return;

    if (!mapRef.current) {
      const allPoints = days.flatMap((d) => d.points);
      const avgLat = allPoints.reduce((s, p) => s + p.lat, 0) / (allPoints.length || 1);
      const avgLng = allPoints.reduce((s, p) => s + p.lng, 0) / (allPoints.length || 1);
      mapRef.current = new google.maps.Map(mapDivRef.current, {
        center: { lat: avgLat || 0, lng: avgLng || 0 },
        zoom: 12,
        streetViewControl: false,
        fullscreenControl: false,
        styles: DECLUTTERED_MAP_STYLES,
      });
      infoWindowRef.current = new google.maps.InfoWindow();
    }

    overlaysRef.current.forEach((o) => o.setMap(null));
    overlaysRef.current = [];

    const bounds = new google.maps.LatLngBounds();

    days.forEach((day) => {
      if (day.points.length === 0) return;
      const color = colorForDay(day.dayIndex - 1);

      const path = day.points.map((p) => ({ lat: p.lat, lng: p.lng }));
      const polyline = new google.maps.Polyline({
        path,
        strokeColor: color,
        strokeWeight: 3,
        strokeOpacity: 0.8,
        map: mapRef.current!,
      });
      overlaysRef.current.push(polyline);

      day.points.forEach((p, idx) => {
        const marker = new google.maps.Marker({
          position: { lat: p.lat, lng: p.lng },
          map: mapRef.current!,
          label: { text: String(idx + 1), color: "white", fontSize: "11px", fontWeight: "bold" },
          title: `יום ${day.dayIndex} · ${p.name}`,
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 10,
            fillColor: color,
            fillOpacity: 1,
            strokeColor: "#fff",
            strokeWeight: 2,
          },
        });
        marker.addListener("click", () => {
          infoWindowRef.current?.setContent(infoWindowHtml(p));
          infoWindowRef.current?.open({ map: mapRef.current!, anchor: marker });
        });
        overlaysRef.current.push(marker);
        bounds.extend({ lat: p.lat, lng: p.lng });
      });
    });

    if (!bounds.isEmpty()) mapRef.current.fitBounds(bounds);
  }, [loaded, days]);

  if (error) {
    return (
      <div className="rounded-lg border p-6 text-center text-sm" style={{ borderColor: "var(--primary)" }}>
        {error}
      </div>
    );
  }

  return <div ref={mapDivRef} className="h-[420px] w-full" style={{ borderRadius: "var(--radius)", border: "1px solid var(--primary)" }} />;
}
