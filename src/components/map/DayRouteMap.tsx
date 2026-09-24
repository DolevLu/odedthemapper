"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useGoogleMaps } from "@/hooks/useGoogleMaps";
import { colorForDay, haversineKm, transportIconFor } from "@/lib/geo";
import { DECLUTTERED_MAP_STYLES, categoryMarkerIcon, currentLocationIcon } from "@/lib/mapStyles";

export type MapDay = {
  dayIndex: number;
  points: {
    id: string;
    name: string;
    lat: number;
    lng: number;
    description?: string | null;
    photoUrl?: string | null;
    timeOfDay?: string | null;
  }[];
};

/** Every other curated point on this destination's real map, NOT part of the
 * planned route — rendered as small grey "ghost" dots so following the route
 * doesn't mean losing sight of what's actually nearby (see the click-to-
 * reveal marker layer below). Same shape as MapScreen's own FlatPoi, trimmed
 * to just what a marker + a lightweight popup need. */
export type OtherPoi = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  categoryName: string;
  categoryColor: string;
  colorHex: string | null;
  iconCategory: string | null;
  photoUrl: string | null;
  description: string | null;
  address?: string | null;
  website?: string | null;
  phone?: string | null;
  googleUrl?: string | null;
  googleRating?: number | null;
  googleRatingCount?: number | null;
  googleHours?: string[] | null;
};

/** Same "where am I" cue as DayItemsList's timeStatusMap — the last
 * time-stamped stop at or before right-now, within one day's own points.
 * Kept in sync with that one deliberately (not imported from it) since it
 * lives in a route-list component, not a shared lib. */
function currentPointId(points: MapDay["points"]): string | null {
  const nowMinutes = new Date().getHours() * 60 + new Date().getMinutes();
  let currentId: string | null = null;
  for (const p of points) {
    if (!p.timeOfDay) continue;
    const [h, m] = p.timeOfDay.split(":").map(Number);
    if (h * 60 + m <= nowMinutes) currentId = p.id;
  }
  return currentId;
}

const MOVE_BTN_STYLE =
  "cursor:pointer;border:1px solid #7C3AED;border-radius:999px;padding:3px 9px;font-size:11px;background:#fff;color:#7C3AED;font-family:'Rubik',sans-serif;white-space:nowrap";

// Same threshold the Map screen's own points use (see LABEL_ZOOM_THRESHOLD
// in MapScreen.tsx) — kept as its own local copy rather than a shared import
// since these are two independent map components (same reasoning as
// currentPointId above, deliberately not shared with DayItemsList's copy).
const LABEL_ZOOM_THRESHOLD = 16;

/** A numbered stop marker, matching MapScreen's own categoryMarkerIcon in
 * spirit — the stop number is baked into the SVG itself (not the Marker's
 * own .setLabel(), which is reserved for the POI name tag that appears
 * above the pin once zoomed in far enough, the same "scan a cluster of
 * points at a glance" behavior the Map screen's own pins already have).
 * google.maps.Symbol (the plain SymbolPath.CIRCLE icon this replaces)
 * doesn't support labelOrigin — only an Icon (image/data-url) does — which
 * is the real reason this needs to be an SVG icon instead of a Symbol. */
// Green = DONE_COLOR everywhere below (points, ring, the walked portion of
// the route line) — one constant so all three visibly agree with each other.
const DONE_COLOR = "#22C55E";

function numberedStopIcon(stopNumber: number, color: string, isCurrent: boolean, isDone: boolean): google.maps.Icon {
  const scale = isCurrent ? 13 : 10;
  const size = scale * 2;
  // A stop already reached today (its time-of-day is at or before right now,
  // and it's earlier in the day than the current stop) fills solid green —
  // "already done" — same idea as the day view's own current/next highlight,
  // extended backward to the whole walked stretch instead of just the one
  // stop happening right now. The current stop itself keeps its own
  // distinct treatment (day color + green ring, bigger) rather than also
  // going solid green, so "here right now" still reads differently from
  // "already visited".
  const fill = isDone ? DONE_COLOR : color;
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
      <circle cx="${scale}" cy="${scale}" r="${scale - 1.5}" fill="${fill}" stroke="${isCurrent ? DONE_COLOR : "white"}" stroke-width="${isCurrent ? 3 : 2}" />
      <text x="${scale}" y="${scale + 4}" font-size="11" font-weight="700" font-family="Arial, sans-serif" text-anchor="middle" fill="white">${stopNumber}</text>
    </svg>`;
  return {
    url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
    scaledSize: new google.maps.Size(size, size),
    anchor: new google.maps.Point(scale, scale),
    labelOrigin: new google.maps.Point(scale, -8),
  };
}

// Deliberately tiny and plain grey — a passive "here's what else is around"
// layer, not competing with the route's own numbered stops for attention.
const GHOST_RADIUS_PX = 4;

function otherPoiInfoWindowHtml(p: OtherPoi): string {
  const photo = p.photoUrl
    ? `<img src="${p.photoUrl}" alt="" style="width:200px;height:110px;object-fit:cover;border-radius:8px;margin-bottom:6px" />`
    : "";
  const description = p.description
    ? `<div style="font-size:12px;opacity:.75;margin-top:4px;max-width:220px">${p.description.slice(0, 200)}</div>`
    : "";
  const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const safe = (u: string) => (/^https?:\/\//i.test(u) ? esc(u) : "#");
  const line = (html: string) => `<div style="font-size:12px;margin-top:3px;max-width:230px">${html}</div>`;
  // Same details block the main Map screen's popup shows for a point linked
  // to a Google Place, so a point reads the same wherever it's opened.
  const google = [
    p.googleRating != null ? line(`⭐ ${p.googleRating}${p.googleRatingCount ? ` · ${p.googleRatingCount.toLocaleString("he-IL")} ביקורות` : ""}`) : "",
    p.address ? line(`📍 ${esc(p.address)}`) : "",
    p.phone ? line(`<a href="tel:${esc(p.phone)}" style="color:#7C3AED">📞 ${esc(p.phone)}</a>`) : "",
    p.website ? line(`<a href="${safe(p.website)}" target="_blank" rel="noopener" style="color:#7C3AED">🌐 אתר</a>`) : "",
    p.googleUrl ? line(`<a href="${safe(p.googleUrl)}" target="_blank" rel="noopener" style="color:#7C3AED">🗺️ פתיחה ב-Google Maps</a>`) : "",
    p.googleHours && p.googleHours.length > 0
      ? `<details style="font-size:12px;margin-top:3px"><summary style="cursor:pointer">🕐</summary>${p.googleHours.map((h) => `<div>${esc(h)}</div>`).join("")}</details>`
      : "",
  ].join("");
  return `<div style="font-family:'Rubik',sans-serif;padding:8px">${photo}<strong>${p.name}</strong><div style="font-size:11px;opacity:.6;margin-top:2px">${p.categoryName}</div>${google}${description}</div>`;
}

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
  return `<div style="font-family:'Rubik',sans-serif;padding:8px">${photo}<strong>${p.name}</strong>${description}${moveButtons}</div>`;
}

export function DayRouteMap({
  days,
  fillHeight = false,
  mobileFullScreen = false,
  showDaySwitcher = true,
  activeDayIndex: controlledActiveDayIndex,
  onActiveDayIndexChange,
  onMoveToDay,
  todayDayIndex = null,
  otherPois = [],
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
  /** Which dayIndex is actually today's real calendar date (see
   * resolveTodayDayIndex) — gates the "current stop" green marker so it
   * only ever appears on the one day genuinely happening right now, not on
   * any day whose stop time-of-day happens to match the clock. */
  todayDayIndex?: number | null;
  /** Every other curated point on this destination, shown as small grey
   * ghost dots so the route stays the visual focus while what's actually
   * nearby is still one click away — see OtherPoi. */
  otherPois?: OtherPoi[];
}) {
  const { loaded, error } = useGoogleMaps();
  const mapDivRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const overlaysRef = useRef<(google.maps.Marker | google.maps.Polyline)[]>([]);
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);
  const onMoveToDayRef = useRef(onMoveToDay);
  onMoveToDayRef.current = onMoveToDay;
  // Stop markers only — keyed by point id, so the zoom-based name-label
  // effect below can update labels without touching the transport-mode
  // midpoint markers or needing to rebuild anything.
  const stopMarkersRef = useRef<Map<string, { marker: google.maps.Marker; name: string }>>(new Map());
  const labeledStopIdsRef = useRef<Set<string>>(new Set());
  // The ghost layer's own markers, separate from overlaysRef (which gets
  // torn down and rebuilt on every day-filter change) — these don't depend
  // on which day is active, so they're managed independently and only
  // rebuilt when the underlying otherPois list itself changes.
  const revealMarkerRef = useRef<google.maps.Marker | null>(null);
  const revealedIdRef = useRef<string | null>(null);
  const revertRevealedRef = useRef<(() => void) | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const userMarkerRef = useRef<google.maps.Marker | null>(null);

  const [internalActiveDayIndex, setInternalActiveDayIndex] = useState<number | null>(null);
  const [mapType, setMapType] = useState<"roadmap" | "satellite">("roadmap");
  // Master switch for the grey "other points" layer (see below).
  const [showGhosts, setShowGhosts] = useState(false);
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
        // Google's own native (English) Map/Satellite control is replaced by
        // our own compact Hebrew toggle below — without this, both rendered
        // at once, the native one large and behind ours.
        mapTypeControl: false,
        gestureHandling: "greedy",
        styles: DECLUTTERED_MAP_STYLES,
      });
      infoWindowRef.current = new google.maps.InfoWindow();
      // Closing the popup (its own X) or tapping empty map puts any revealed
      // "ghost" point back to a grey dot - see the ghost layer below.
      google.maps.event.addListener(infoWindowRef.current, "closeclick", () => revertRevealedRef.current?.());
      mapRef.current.addListener("click", () => {
        infoWindowRef.current?.close();
        revertRevealedRef.current?.();
      });

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
    stopMarkersRef.current.clear();
    labeledStopIdsRef.current.clear();

    const bounds = new google.maps.LatLngBounds();

    visibleDays.forEach((day) => {
      if (day.points.length === 0) return;
      const color = colorForDay(day.dayIndex - 1);

      const path = day.points.map((p) => ({ lat: p.lat, lng: p.lng }));
      const currentId = day.dayIndex === todayDayIndex ? currentPointId(day.points) : null;
      const currentIndex = currentId ? day.points.findIndex((p) => p.id === currentId) : -1;

      // The stretch already walked today (stop 0 through the current stop)
      // draws in green, on top of the day's own normal-colored line for the
      // stretch still ahead — same "where am I" cue as the numbered stops
      // themselves, extended to the route line connecting them. A separate
      // polyline rather than one with a gradient stroke (Maps' Polyline
      // doesn't support one) — the two segments share the current stop's
      // point so there's no visible gap between them.
      if (currentIndex > 0) {
        const donePath = path.slice(0, currentIndex + 1);
        const donePolyline = new google.maps.Polyline({
          path: donePath,
          strokeColor: DONE_COLOR,
          strokeWeight: 4,
          strokeOpacity: 0.9,
          zIndex: 10,
          map: mapRef.current!,
        });
        overlaysRef.current.push(donePolyline);
      }
      const remainingPath = currentIndex > 0 ? path.slice(currentIndex) : path;
      const polyline = new google.maps.Polyline({
        path: remainingPath,
        strokeColor: color,
        strokeWeight: 3,
        strokeOpacity: 0.8,
        zIndex: 5,
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
        const isCurrent = idx === currentIndex;
        const isDone = currentIndex > 0 && idx < currentIndex;
        const marker = new google.maps.Marker({
          position: { lat: p.lat, lng: p.lng },
          map: mapRef.current!,
          title: `יום ${day.dayIndex} · ${p.name}${isCurrent ? " (עכשיו)" : isDone ? " (בוצע)" : ""}`,
          // Same "where am I" cue as the list view's green highlight — a
          // slightly bigger circle with a green ring instead of the usual
          // white one, so the current stop reads at a glance on the map too.
          // The stop number is baked into this icon itself (see
          // numberedStopIcon) rather than using .label — that slot is
          // reserved for the POI name tag shown once zoomed in (below),
          // matching the Map screen's own points.
          icon: numberedStopIcon(idx + 1, color, isCurrent, isDone),
          zIndex: isCurrent ? 500 : isDone ? 100 : undefined,
        });
        marker.addListener("click", () => {
          revertRevealedRef.current?.();
          infoWindowRef.current?.setContent(infoWindowHtml(p, day.dayIndex, days.length, Boolean(onMoveToDayRef.current)));
          infoWindowRef.current?.open({ map: mapRef.current!, anchor: marker });
        });
        overlaysRef.current.push(marker);
        stopMarkersRef.current.set(p.id, { marker, name: p.name });
        bounds.extend({ lat: p.lat, lng: p.lng });
      });
    });

    if (!bounds.isEmpty()) mapRef.current.fitBounds(bounds);
  }, [loaded, days, visibleDays, todayDayIndex]);

  // The "ghost" layer: every other curated point on this destination, as
  // small grey dots - independent of which day is filtered (it's "what's
  // around", not part of any one day's route), so it only rebuilds when the
  // underlying list itself changes.
  //
  // Drawn as google.maps.Circle shapes, NOT Markers, on purpose: shapes render
  // in the map's overlay layer, which sits UNDER the marker layer, so the dots
  // end up behind the route's own numbered stops (markers) AND behind its
  // lines (polylines, given a higher zIndex than these circles) - the route is
  // the centre of this screen, the dots are background. A Marker could never
  // go under a polyline. The radius is recomputed on zoom so a dot stays a
  // constant few pixels wide instead of scaling with the map like a real
  // metres-radius circle would.
  //
  // Clicking one reveals it: a Marker with its real category icon/colour
  // (same categoryMarkerIcon the main Map screen uses) takes its place and
  // opens its popup. Closing the popup - or tapping the map, or opening any
  // other point - puts it back to a grey dot (revertRevealed).
  useEffect(() => {
    if (!loaded || !mapRef.current || !showGhosts) return;
    const map = mapRef.current;
    const circles = new Map<string, { circle: google.maps.Circle; lat: number }>();

    function radiusFor(lat: number): number {
      const zoom = map.getZoom() ?? 12;
      return (GHOST_RADIUS_PX * 156543.03392 * Math.cos((lat * Math.PI) / 180)) / Math.pow(2, zoom);
    }

    function revert() {
      revealMarkerRef.current?.setMap(null);
      const id = revealedIdRef.current;
      if (id) circles.get(id)?.circle.setVisible(true);
      revealedIdRef.current = null;
    }
    revertRevealedRef.current = revert;

    otherPois.forEach((p) => {
      const circle = new google.maps.Circle({
        center: { lat: p.lat, lng: p.lng },
        radius: radiusFor(p.lat),
        map,
        fillColor: "#9CA3AF",
        fillOpacity: 0.95,
        strokeColor: "#FFFFFF",
        strokeOpacity: 1,
        strokeWeight: 1,
        clickable: true,
        zIndex: 1,
      });
      circle.addListener("click", () => {
        revert();
        revealedIdRef.current = p.id;
        circle.setVisible(false);
        if (!revealMarkerRef.current) revealMarkerRef.current = new google.maps.Marker({ zIndex: 300 });
        const marker = revealMarkerRef.current;
        marker.setPosition({ lat: p.lat, lng: p.lng });
        marker.setTitle(p.name);
        marker.setIcon(categoryMarkerIcon(p.categoryColor, p.iconCategory ?? p.categoryName, 10, false, p.colorHex, p.name));
        marker.setMap(map);
        infoWindowRef.current?.setContent(otherPoiInfoWindowHtml(p));
        infoWindowRef.current?.open({ map, anchor: marker });
      });
      circles.set(p.id, { circle, lat: p.lat });
    });

    const zoomListener = map.addListener("zoom_changed", () => {
      circles.forEach(({ circle, lat }) => circle.setRadius(radiusFor(lat)));
    });

    return () => {
      google.maps.event.removeListener(zoomListener);
      revert();
      revertRevealedRef.current = null;
      circles.forEach(({ circle }) => circle.setMap(null));
      circles.clear();
    };
  }, [loaded, otherPois, showGhosts]);

  // "You are here", same blue-dot treatment as the main Map screen — auto-
  // starts once today is genuinely a day of this trip (todayDayIndex set,
  // the same signal the current-stop highlight above already gates on),
  // matching "from the moment the countdown ends, show me where I actually
  // am" rather than needing a manual GPS toggle here too.
  useEffect(() => {
    if (!loaded || !mapRef.current || todayDayIndex == null) return;
    if (!navigator.geolocation) return;

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const point = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        if (!userMarkerRef.current && mapRef.current) {
          userMarkerRef.current = new google.maps.Marker({
            position: point,
            map: mapRef.current,
            icon: currentLocationIcon(),
            zIndex: 999,
          });
        } else {
          userMarkerRef.current?.setPosition(point);
        }
      },
      () => {},
      { enableHighAccuracy: true }
    );

    return () => {
      if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
      userMarkerRef.current?.setMap(null);
      userMarkerRef.current = null;
    };
  }, [loaded, todayDayIndex]);

  useEffect(() => {
    if (!loaded || !mapRef.current) return;
    mapRef.current.setMapTypeId(mapType);
  }, [loaded, mapType]);

  // Name-tag labels above stop markers once zoomed in — same behavior and
  // threshold as the Map screen's own points (see LABEL_ZOOM_THRESHOLD),
  // so a route stop reads the same way whether it's viewed from here or
  // there. Only touches a marker's label when its labeled state actually
  // flips, same guard MapScreen's own version uses to avoid doing real work
  // on every pan/zoom idle event.
  useEffect(() => {
    if (!loaded || !mapRef.current) return;
    const map = mapRef.current;

    function updateLabels() {
      const zoom = map.getZoom() ?? 0;
      const bounds = map.getBounds();
      const showLabels = zoom >= LABEL_ZOOM_THRESHOLD && !!bounds;
      if (!showLabels && labeledStopIdsRef.current.size === 0) return;

      const nextLabeled = new Set<string>();
      stopMarkersRef.current.forEach(({ marker, name }, id) => {
        const position = marker.getPosition();
        const inView = showLabels && position && bounds!.contains(position);
        if (inView) nextLabeled.add(id);
        const wasLabeled = labeledStopIdsRef.current.has(id);
        if (inView !== wasLabeled) {
          marker.setLabel(inView ? { text: name, color: "#FFFFFF", fontSize: "11px", fontWeight: "700", className: "poi-marker-label" } : "");
        }
      });
      labeledStopIdsRef.current = nextLabeled;
    }

    const listener = map.addListener("idle", updateLabels);
    return () => listener.remove();
  }, [loaded]);

  if (error) {
    return (
      <div className="rounded-lg border p-6 text-center text-sm" style={{ borderColor: "var(--primary)" }}>
        {error}
      </div>
    );
  }

  const containerClass = mobileFullScreen
    ? "fixed inset-x-0 bottom-0 top-0 z-0 flex flex-col gap-2 sm:relative sm:inset-auto sm:bottom-auto sm:top-auto sm:h-full"
    : fillHeight
      ? "flex h-[380px] min-h-0 flex-col gap-2 lg:h-full"
      : "flex flex-col gap-2";

  return (
    <div className={containerClass}>
      <div className={mobileFullScreen || fillHeight ? "relative w-full flex-1 min-h-0" : "relative h-[420px] w-full"}>
        <div
          ref={mapDivRef}
          className={mobileFullScreen ? "h-full w-full sm:rounded-[var(--radius)] sm:border" : "h-full w-full"}
          style={mobileFullScreen ? undefined : { borderRadius: "var(--radius)", border: "1px solid var(--primary)" }}
        />
        {/* Floating over the map itself (not a block above it, which used to
         * push the map down as its own banner row) — same floating-pill
         * treatment as the main map screen's own category filters. Opposite
         * corner from the map/satellite toggle. */}
        {showDaySwitcher && days.length > 1 && (
          <div className={`absolute start-2 z-10 flex flex-wrap gap-1 ${mobileFullScreen ? "bottom-[190px] sm:top-2" : "top-2"}`}>
            <button
              onClick={() => setActiveDayIndex(null)}
              className="rounded-full px-3 py-1 text-xs font-semibold shadow-md"
              style={{
                background: activeDayIndex == null ? "var(--primary)" : "rgba(255,255,255,0.95)",
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
                  className="rounded-full px-3 py-1 text-xs font-semibold shadow-md"
                  style={{
                    background: active ? color : "rgba(255,255,255,0.95)",
                    color: active ? "white" : "var(--text)",
                  }}
                >
                  יום {day.dayIndex}
                </button>
              );
            })}
          </div>
        )}
        {/* Small Hebrew Map/Satellite toggle — top-left on desktop (matches
         * the main Map screen's own control). In the mobile full-screen
         * (itinerary) layout it sits top-right instead, just below the
         * floating profile/bell header (AppSidebar) — same reserved right-
         * side column that header's own pe-14 gap on the filter row above
         * leaves empty, so it drops in there without overlapping either. */}
        <div
          className={`absolute z-10 flex gap-0.5 rounded-full bg-white/95 p-0.5 text-[11px] font-semibold shadow-md ${
            mobileFullScreen ? "start-2 top-[calc(3.5rem+env(safe-area-inset-top))] sm:end-2 sm:start-auto sm:top-2" : "end-2 top-2"
          }`}
        >
          <button
            onClick={() => setMapType("roadmap")}
            className="rounded-full px-2.5 py-1"
            style={{ background: mapType === "roadmap" ? "var(--primary)" : "transparent", color: mapType === "roadmap" ? "white" : "#1a1a1a" }}
          >
            מפה
          </button>
          <button
            onClick={() => setMapType("satellite")}
            className="rounded-full px-2.5 py-1"
            style={{ background: mapType === "satellite" ? "var(--primary)" : "transparent", color: mapType === "satellite" ? "white" : "#1a1a1a" }}
          >
            לוויין
          </button>
        </div>
        {/* One small switch for the whole grey "other points" layer — right
         * under the Map/Satellite toggle so the two map-display controls
         * sit together. Only rendered when there ARE other points. */}
        {otherPois.length > 0 && (
          <button
            onClick={() => setShowGhosts((v) => !v)}
            aria-pressed={showGhosts}
            title={showGhosts ? "הסתרת נקודות נוספות" : "הצגת נקודות נוספות"}
            className={`absolute z-10 flex items-center gap-1.5 rounded-full bg-white/95 px-2.5 py-1 text-[11px] font-semibold shadow-md ${
              mobileFullScreen ? "start-2 top-[calc(6.25rem+env(safe-area-inset-top))] sm:end-2 sm:start-auto sm:top-12" : "end-2 top-12"
            }`}
            style={{ color: "#1a1a1a" }}
          >
            <span
              aria-hidden="true"
              className="inline-block h-2.5 w-2.5 rounded-full"
              style={{ background: showGhosts ? "#9CA3AF" : "transparent", border: "1.5px solid #9CA3AF" }}
            />
            נקודות נוספות
          </button>
        )}
      </div>
    </div>
  );
}
