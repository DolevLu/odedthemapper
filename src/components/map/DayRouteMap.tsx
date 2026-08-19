"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useGoogleMaps } from "@/hooks/useGoogleMaps";
import { colorForDay, haversineKm } from "@/lib/geo";
import { DECLUTTERED_MAP_STYLES } from "@/lib/mapStyles";

export type MapDay = {
  dayIndex: number;
  points: { id: string; name: string; lat: number; lng: number; description?: string | null; photoUrl?: string | null }[];
};

const MOVE_BTN_STYLE =
  "cursor:pointer;border:1px solid #7C3AED;border-radius:999px;padding:3px 9px;font-size:11px;background:#fff;color:#7C3AED;font-family:'Rubik',sans-serif;white-space:nowrap";

function infoWindowHtml(p: MapDay["points"][number], currentDayIndex: number, totalDays: number, movable: boolean): string {
  const photo = p.photoUrl
    ? `<img src="${p.photoUrl}" alt="" style="width:200px;height:110px;object-fit:cover;border-radius:8px;margin-bottom:6px" />`
    : "";
  const description = p.description
    ? `<div style="font-size:12px;opacity:.75;margin-top:4px;max-width:220px">${p.description.slice(0, 200)}</div>`
    : "";
  const otherDays = Array.from({ length: totalDays }, (_, i) => i + 1).filter((d) => d !== currentDayIndex);
  const moveButtons =
    movable && otherDays.length > 0
      ? `<div style="margin-top:8px;max-width:220px">
          <div style="font-size:11px;opacity:.6;margin-bottom:4px">העברה ליום:</div>
          <div style="display:flex;flex-wrap:wrap;gap:4px">
            ${otherDays.map((d) => `<button data-move-btn data-item-id="${p.id}" data-day="${d}" style="${MOVE_BTN_STYLE}">יום ${d}</button>`).join("")}
          </div>
        </div>`
      : "";
  return `<div style="font-family:'Rubik',sans-serif;padding:2px 4px">${photo}<strong>${p.name}</strong>${description}${moveButtons}</div>`;
}

/** Honest heuristic, not real transit routing: short hops are walkable,
 * medium ones are bus-distance, long ones are more likely a metro/train. */
function transportIconFor(distanceKm: number): string {
  if (distanceKm < 1) return "🚶";
  if (distanceKm < 4) return "🚌";
  return "🚇";
}

export function DayRouteMap({
  days,
  fillHeight = false,
  mobileFullScreen = false,
  showDaySwitcher = true,
  activeDayIndex: controlledActiveDayIndex,
  onActiveDayIndexChange,
  onMoveToDay,
}: {
  days: MapDay[];
  fillHeight?: boolean;
  /** Below the sm breakpoint, fills the viewport below the header (fixed
   * positioning) instead of flowing in-page — used by the mobile itinerary
   * layout, which overlays a draggable list drawer on top of this. */
  mobileFullScreen?: boolean;
  /** Hides the built-in day-pill row — used when an outer component (the
   * mobile drawer) already renders its own, synced day switcher. */
  showDaySwitcher?: boolean;
  /** Controlled active-day selection; falls back to internal state when
   * omitted (existing desktop usage is unaffected). */
  activeDayIndex?: number | null;
  onActiveDayIndexChange?: (dayIndex: number | null) => void;
  /** When provided, marker popups show "move to day N" buttons; clicking one
   * calls this with the point's id (an ItineraryItem id) and the target day. */
  onMoveToDay?: (itemId: string, dayIndex: number) => void;
}) {
  const { loaded, error } = useGoogleMaps();
  const mapDivRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const overlaysRef = useRef<(google.maps.Marker | google.maps.Polyline)[]>([]);
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);
  const onMoveToDayRef = useRef(onMoveToDay);
  onMoveToDayRef.current = onMoveToDay;

  const [internalActiveDayIndex, setInternalActiveDayIndex] = useState<number | null>(null);
  const activeDayIndex = controlledActiveDayIndex !== undefined ? controlledActiveDayIndex : internalActiveDayIndex;
  const setActiveDayIndex = onActiveDayIndexChange ?? setInternalActiveDayIndex;

  const visibleDays = useMemo(
    () => (activeDayIndex == null ? days : days.filter((d) => d.dayIndex === activeDayIndex)),
    [days, activeDayIndex]
  );

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
        gestureHandling: "greedy",
        styles: DECLUTTERED_MAP_STYLES,
      });
      infoWindowRef.current = new google.maps.InfoWindow();

      // Wires the plain-HTML "move to day N" buttons inside the info
      // window — fires on every open() since Maps rebuilds the content DOM
      // node each time (same pattern as MapScreen's favorite/booking buttons).
      google.maps.event.addListener(infoWindowRef.current, "domready", () => {
        mapDivRef.current?.querySelectorAll<HTMLButtonElement>("[data-move-btn]").forEach((btn) => {
          btn.onclick = (e) => {
            e.stopPropagation();
            const itemId = btn.getAttribute("data-item-id")!;
            const day = Number(btn.getAttribute("data-day"));
            onMoveToDayRef.current?.(itemId, day);
            infoWindowRef.current?.close();
          };
        });
      });
    }

    overlaysRef.current.forEach((o) => o.setMap(null));
    overlaysRef.current = [];

    const bounds = new google.maps.LatLngBounds();

    visibleDays.forEach((day) => {
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

      // A small transport-mode icon at the midpoint of each hop between
      // consecutive stops — walking/bus/metro based on distance.
      for (let i = 0; i < day.points.length - 1; i++) {
        const a = day.points[i];
        const b = day.points[i + 1];
        const distanceKm = haversineKm([a.lat, a.lng], [b.lat, b.lng]);
        const midpoint = { lat: (a.lat + b.lat) / 2, lng: (a.lng + b.lng) / 2 };
        const transportMarker = new google.maps.Marker({
          position: midpoint,
          map: mapRef.current!,
          clickable: false,
          zIndex: 50,
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 9,
            fillColor: "white",
            fillOpacity: 0.95,
            strokeColor: color,
            strokeWeight: 1.5,
          },
          label: { text: transportIconFor(distanceKm), fontSize: "11px" },
        });
        overlaysRef.current.push(transportMarker);
      }

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
          infoWindowRef.current?.setContent(infoWindowHtml(p, day.dayIndex, days.length, Boolean(onMoveToDayRef.current)));
          infoWindowRef.current?.open({ map: mapRef.current!, anchor: marker });
        });
        overlaysRef.current.push(marker);
        bounds.extend({ lat: p.lat, lng: p.lng });
      });
    });

    if (!bounds.isEmpty()) mapRef.current.fitBounds(bounds);
  }, [loaded, days, visibleDays]);

  if (error) {
    return (
      <div className="rounded-lg border p-6 text-center text-sm" style={{ borderColor: "var(--primary)" }}>
        {error}
      </div>
    );
  }

  const containerClass = mobileFullScreen
    ? "fixed inset-x-0 bottom-0 top-14 z-0 flex flex-col gap-2 sm:relative sm:inset-auto sm:bottom-auto sm:top-auto sm:h-full"
    : fillHeight
      ? "flex h-[380px] min-h-0 flex-col gap-2 lg:h-full"
      : "flex flex-col gap-2";

  return (
    <div className={containerClass}>
      {showDaySwitcher && days.length > 1 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => setActiveDayIndex(null)}
            className="rounded-full border px-3 py-1 text-xs font-semibold"
            style={{
              borderColor: "var(--primary)",
              background: activeDayIndex == null ? "var(--primary)" : "transparent",
              color: activeDayIndex == null ? "white" : "var(--text)",
            }}
          >
            כל הימים
          </button>
          {days.map((day) => {
            const color = colorForDay(day.dayIndex - 1);
            const active = activeDayIndex === day.dayIndex;
            return (
              <button
                key={day.dayIndex}
                onClick={() => setActiveDayIndex(day.dayIndex)}
                className="rounded-full border px-3 py-1 text-xs font-semibold"
                style={{
                  borderColor: color,
                  background: active ? color : "transparent",
                  color: active ? "white" : "var(--text)",
                }}
              >
                יום {day.dayIndex}
              </button>
            );
          })}
        </div>
      )}
      <div
        ref={mapDivRef}
        className={mobileFullScreen ? "w-full flex-1 min-h-0 sm:rounded-[var(--radius)] sm:border" : fillHeight ? "w-full flex-1 min-h-0" : "h-[420px] w-full"}
        style={mobileFullScreen ? undefined : { borderRadius: "var(--radius)", border: "1px solid var(--primary)" }}
      />
    </div>
  );
}
