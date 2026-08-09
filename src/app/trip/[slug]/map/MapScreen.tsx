"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { MarkerClusterer } from "@googlemaps/markerclusterer";
import { useGoogleMaps, loadRoutesLibrary } from "@/hooks/useGoogleMaps";
import type { FlatPoi } from "@/lib/data/pois";
import { FavoriteButton } from "@/components/FavoriteButton";
import { DECLUTTERED_MAP_STYLES, categoryMarkerIcon, currentLocationIcon } from "@/lib/mapStyles";
import { haversineKm } from "@/lib/geo";
import { recordLocationPing } from "@/lib/actions/location";
import { buildDensityGrid, colorForIntensity } from "@/lib/heatmap";

// Only persist a new trail point once the user has actually moved a bit, or
// enough time has passed — GPS ticks arrive every ~1s and would otherwise
// flood the DB with near-duplicate points while standing still.
const TRAIL_MIN_DISTANCE_KM = 0.02;
const TRAIL_MIN_INTERVAL_MS = 8000;

// Finer grid than the logistics "where to stay" heatmap — this one is
// viewed zoomed into a single city rather than a whole destination.
const HEATMAP_CELL_DEG = 0.004;
const METERS_PER_DEGREE_LAT = 111320;

// Only label individual pins once zoomed in enough that a name tag per
// marker is legible rather than overlapping clutter.
const LABEL_ZOOM_THRESHOLD = 16;

function infoWindowHtml(poi: FlatPoi): string {
  const photo = poi.photoUrl
    ? `<img src="${poi.photoUrl}" alt="" style="width:220px;height:120px;object-fit:cover;border-radius:8px;margin-bottom:6px" />`
    : "";
  const description = poi.description
    ? `<div style="font-size:12px;opacity:.75;margin-top:4px;max-width:220px">${poi.description.slice(0, 220)}</div>`
    : "";
  return `<div style="font-family:'Rubik',sans-serif;padding:2px 4px">
    ${photo}
    <strong>${poi.name}</strong><br/>
    <span style="opacity:.6;font-size:12px">${poi.categoryName} · ${poi.areaName}</span>
    ${description}
  </div>`;
}

function formatDistance(km: number): string {
  return km < 1 ? `${Math.round(km * 1000)} מ׳` : `${km.toFixed(1)} ק״מ`;
}

type LogisticPin = { id: string; type: string; title: string; lat: number; lng: number; dateRange: string | null };

const LOGISTIC_EMOJI: Record<string, string> = {
  flight: "✈️",
  hotel: "🏨",
  ticket: "🎫",
  passport: "🛂",
  visa: "📋",
  insurance: "🛡️",
  vaccination: "💉",
  other: "📄",
};

export function MapScreen({
  pois,
  categoryNames,
  slug,
  favoritedIds,
  logisticPins = [],
  destinationId,
  initialTrail = [],
  homeMode = false,
}: {
  pois: FlatPoi[];
  categoryNames: string[];
  slug: string;
  favoritedIds: Set<string>;
  logisticPins?: LogisticPin[];
  destinationId: string;
  initialTrail?: { lat: number; lng: number }[];
  /** Fullscreen "Google Maps app"-style layout used as the mobile trip home
   * screen: floating filter pills over an edge-to-edge map instead of the
   * category row + side/below list, with location tracking auto-started. */
  homeMode?: boolean;
}) {
  const { loaded, error } = useGoogleMaps();
  const searchParams = useSearchParams();
  const focusPoiId = searchParams.get("focus");
  const mapDivRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const clustererRef = useRef<MarkerClusterer | null>(null);
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);
  const markersByPoiId = useRef<Map<string, google.maps.Marker>>(new Map());
  const shapesRef = useRef<(google.maps.Polygon | google.maps.Polyline)[]>([]);
  const userMarkerRef = useRef<google.maps.Marker | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const directionsServiceRef = useRef<google.maps.DirectionsService | null>(null);
  const directionsRendererRef = useRef<google.maps.DirectionsRenderer | null>(null);
  const trailPolylineRef = useRef<google.maps.Polyline | null>(null);
  const lastTrailPointRef = useRef<{ lat: number; lng: number; time: number } | null>(null);
  const heatmapCirclesRef = useRef<google.maps.Circle[]>([]);
  const autoLocationStartedRef = useRef(false);

  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [selectedPoiId, setSelectedPoiId] = useState<string | null>(null);
  const [gpsActive, setGpsActive] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [userPosition, setUserPosition] = useState<{ lat: number; lng: number } | null>(null);
  const [routeToPoiId, setRouteToPoiId] = useState<string | null>(null);
  const [routeError, setRouteError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [trailVisible, setTrailVisible] = useState(false);
  const [trailPoints, setTrailPoints] = useState(initialTrail);
  const [heatmapVisible, setHeatmapVisible] = useState(false);

  const pointPois = useMemo(() => pois.filter((p) => p.geometryType === "point"), [pois]);
  const shapePois = useMemo(() => pois.filter((p) => p.geometryType !== "point" && p.geometryCoords), [pois]);
  const filtered = useMemo(
    () => (activeCategory ? pointPois.filter((p) => p.categoryName === activeCategory) : pointPois),
    [pointPois, activeCategory]
  );

  const sortedList = useMemo(() => {
    if (!gpsActive || !userPosition) return filtered;
    return [...filtered]
      .map((p) => ({ ...p, distanceKm: haversineKm([userPosition.lat, userPosition.lng], [p.lat, p.lng]) }))
      .sort((a, b) => a.distanceKm - b.distanceKm);
  }, [filtered, gpsActive, userPosition]);

  // Initialize the map once Google Maps is loaded.
  useEffect(() => {
    if (!loaded || !mapDivRef.current || mapRef.current) return;

    const avgLat = pointPois.reduce((s, p) => s + p.lat, 0) / (pointPois.length || 1);
    const avgLng = pointPois.reduce((s, p) => s + p.lng, 0) / (pointPois.length || 1);

    mapRef.current = new google.maps.Map(mapDivRef.current, {
      center: { lat: avgLat, lng: avgLng },
      zoom: 12,
      streetViewControl: false,
      fullscreenControl: false,
      // "greedy" lets a single finger pan/zoom the map immediately — Google's
      // default "cooperative" mode demands two fingers specifically so an
      // embedded map doesn't trap the page's scroll gesture, but that's not
      // a concern here since the map has its own fixed-height container.
      gestureHandling: "greedy",
      styles: DECLUTTERED_MAP_STYLES,
    });
    infoWindowRef.current = new google.maps.InfoWindow();
  }, [loaded, pointPois]);

  // Render line/polygon geometries (walking routes, districts, etc.) once.
  useEffect(() => {
    if (!loaded || !mapRef.current) return;
    shapesRef.current.forEach((s) => s.setMap(null));
    shapesRef.current = [];

    shapePois.forEach((poi) => {
      const path = (poi.geometryCoords ?? []).map(([lng, lat]) => ({ lat, lng }));
      if (path.length < 2) return;
      if (poi.geometryType === "polygon") {
        const polygon = new google.maps.Polygon({
          paths: path,
          strokeColor: poi.categoryColor,
          strokeWeight: 2,
          fillColor: poi.categoryColor,
          fillOpacity: 0.15,
          map: mapRef.current!,
        });
        shapesRef.current.push(polygon);
      } else {
        const polyline = new google.maps.Polyline({
          path,
          strokeColor: poi.categoryColor,
          strokeWeight: 3,
          strokeOpacity: 0.8,
          map: mapRef.current!,
        });
        shapesRef.current.push(polyline);
      }
    });
  }, [loaded, shapePois]);

  // "Places I've been" trail — a single long-lived polyline whose path grows
  // as new GPS points come in, toggled on/off exactly like a category layer.
  useEffect(() => {
    if (!loaded || !mapRef.current) return;
    if (!trailPolylineRef.current) {
      trailPolylineRef.current = new google.maps.Polyline({
        path: [],
        strokeColor: "#22C55E",
        strokeWeight: 4,
        strokeOpacity: 0.85,
        map: null,
      });
    }
    trailPolylineRef.current.setPath(trailPoints);
    trailPolylineRef.current.setMap(trailVisible ? mapRef.current : null);
  }, [loaded, trailPoints, trailVisible]);

  // Density heatmap — buckets all POIs into a grid and renders yellow→red
  // circles by concentration, replacing individual pins while active.
  useEffect(() => {
    if (!loaded || !mapRef.current) return;
    heatmapCirclesRef.current.forEach((c) => c.setMap(null));
    heatmapCirclesRef.current = [];
    if (!heatmapVisible) return;

    const points = pointPois.map((p) => [p.lat, p.lng] as [number, number]);
    const grid = buildDensityGrid(points, HEATMAP_CELL_DEG);
    if (grid.length === 0) return;
    const maxCount = grid.reduce((m, c) => Math.max(m, c.count), 1);
    const radiusMeters = HEATMAP_CELL_DEG * METERS_PER_DEGREE_LAT * 0.65;

    heatmapCirclesRef.current = grid.map((cell) => {
      const intensity = cell.count / maxCount;
      return new google.maps.Circle({
        center: { lat: cell.lat, lng: cell.lng },
        radius: radiusMeters,
        map: mapRef.current!,
        strokeWeight: 0,
        fillColor: colorForIntensity(intensity),
        fillOpacity: 0.18 + intensity * 0.5,
        clickable: false,
        zIndex: 50,
      });
    });
  }, [loaded, heatmapVisible, pointPois]);

  // Render saved logistics (hotel/flight/etc. with a geocoded address) as their own pins.
  const logisticMarkersRef = useRef<google.maps.Marker[]>([]);
  useEffect(() => {
    if (!loaded || !mapRef.current) return;
    logisticMarkersRef.current.forEach((m) => m.setMap(null));
    logisticMarkersRef.current = [];

    logisticPins.forEach((pin) => {
      const marker = new google.maps.Marker({
        position: { lat: pin.lat, lng: pin.lng },
        map: mapRef.current!,
        label: { text: LOGISTIC_EMOJI[pin.type] ?? "📍", fontSize: "16px" },
        title: pin.title,
        zIndex: 500,
      });
      marker.addListener("click", () => {
        infoWindowRef.current?.setContent(
          `<div style="font-family:'Rubik',sans-serif;padding:2px 4px"><strong>${pin.title}</strong>${
            pin.dateRange ? `<br/><span style="opacity:.6;font-size:12px">${pin.dateRange}</span>` : ""
          }</div>`
        );
        infoWindowRef.current?.open({ map: mapRef.current!, anchor: marker });
      });
      logisticMarkersRef.current.push(marker);
    });
  }, [loaded, logisticPins]);

  async function drawRouteTo(poi: FlatPoi) {
    if (!userPosition || !mapRef.current) return;
    setRouteError(null);
    try {
      await loadRoutesLibrary();
    } catch {
      setRouteError("מסלול ניווט אינו זמין כרגע");
      return;
    }
    if (!directionsServiceRef.current) {
      directionsServiceRef.current = new google.maps.DirectionsService();
    }
    if (!directionsRendererRef.current) {
      directionsRendererRef.current = new google.maps.DirectionsRenderer({
        map: mapRef.current,
        suppressMarkers: true,
        polylineOptions: { strokeColor: "#4285F4", strokeWeight: 5 },
      });
    }
    setRouteToPoiId(poi.id);
    directionsServiceRef.current.route(
      {
        origin: userPosition,
        destination: { lat: poi.lat, lng: poi.lng },
        travelMode: google.maps.TravelMode.WALKING,
      },
      (result, status) => {
        if (status === "OK" && result) {
          directionsRendererRef.current?.setDirections(result);
        } else {
          setRouteError("לא הצלחנו לחשב מסלול לנקודה הזו");
        }
      }
    );
  }

  function openPoi(poi: FlatPoi, marker: google.maps.Marker) {
    setSelectedPoiId(poi.id);
    infoWindowRef.current?.setContent(infoWindowHtml(poi));
    infoWindowRef.current?.open({ map: mapRef.current!, anchor: marker });
    if (gpsActive && userPosition) drawRouteTo(poi);
  }

  // Rebuild markers whenever the filtered set changes.
  useEffect(() => {
    if (!loaded || !mapRef.current) return;

    clustererRef.current?.clearMarkers();
    markersByPoiId.current.forEach((marker) => marker.setMap(null));
    markersByPoiId.current.clear();

    if (heatmapVisible) return; // the heatmap layer replaces individual pins

    const markers = filtered.map((poi) => {
      const marker = new google.maps.Marker({
        position: { lat: poi.lat, lng: poi.lng },
        title: poi.name,
        icon: categoryMarkerIcon(poi.categoryColor, poi.categoryName),
      });
      marker.addListener("click", () => openPoi(poi, marker));
      markersByPoiId.current.set(poi.id, marker);
      return marker;
    });

    clustererRef.current = new MarkerClusterer({ map: mapRef.current, markers });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, filtered, gpsActive, userPosition, heatmapVisible]);

  // Name-tag labels for nearby pins once zoomed in — lets you scan a
  // cluster of points at a glance instead of tapping each one.
  useEffect(() => {
    if (!loaded || !mapRef.current) return;
    const map = mapRef.current;

    function updateLabels() {
      const zoom = map.getZoom() ?? 0;
      const bounds = map.getBounds();
      const showLabels = zoom >= LABEL_ZOOM_THRESHOLD && !!bounds;
      markersByPoiId.current.forEach((marker, id) => {
        const position = marker.getPosition();
        const poi = showLabels && position && bounds!.contains(position) ? pointPois.find((p) => p.id === id) : null;
        marker.setLabel(poi ? { text: poi.name, color: "#1F2937", fontSize: "11px", fontWeight: "700" } : "");
      });
    }

    const listener = map.addListener("idle", updateLabels);
    return () => listener.remove();
  }, [loaded, pointPois]);

  function focusPoi(poiId: string) {
    const poi = filtered.find((p) => p.id === poiId);
    const marker = markersByPoiId.current.get(poiId);
    if (!poi || !marker || !mapRef.current) return;
    mapRef.current.panTo({ lat: poi.lat, lng: poi.lng });
    mapRef.current.setZoom(16);
    openPoi(poi, marker);
  }

  function maybeRecordTrailPoint(point: { lat: number; lng: number }) {
    const last = lastTrailPointRef.current;
    const now = Date.now();
    if (last) {
      const distKm = haversineKm([last.lat, last.lng], [point.lat, point.lng]);
      if (distKm < TRAIL_MIN_DISTANCE_KM && now - last.time < TRAIL_MIN_INTERVAL_MS) return;
    }
    lastTrailPointRef.current = { ...point, time: now };
    setTrailPoints((prev) => [...prev, point]);
    recordLocationPing(destinationId, point.lat, point.lng).catch(() => {});
  }

  function toggleGps() {
    if (gpsActive) {
      if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
      userMarkerRef.current?.setMap(null);
      userMarkerRef.current = null;
      directionsRendererRef.current?.setDirections({ routes: [] } as unknown as google.maps.DirectionsResult);
      setRouteToPoiId(null);
      setGpsActive(false);
      setUserPosition(null);
      return;
    }

    if (!navigator.geolocation) {
      setGpsError("הדפדפן לא תומך במיקום");
      return;
    }
    setGpsError(null);
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const point = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserPosition(point);
        if (!userMarkerRef.current && mapRef.current) {
          userMarkerRef.current = new google.maps.Marker({
            position: point,
            map: mapRef.current,
            icon: currentLocationIcon(),
            zIndex: 999,
            title: "המיקום שלי",
          });
          mapRef.current.panTo(point);
          mapRef.current.setZoom(15);
        } else {
          userMarkerRef.current?.setPosition(point);
        }
        maybeRecordTrailPoint(point);
      },
      () => setGpsError("לא הצלחנו לקבל מיקום — בדקו הרשאות מיקום בדפדפן"),
      { enableHighAccuracy: true }
    );
    setGpsActive(true);
  }

  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
    };
  }, []);

  // Google-Maps-app-style default: on the mobile home map, location tracking
  // just starts on its own instead of waiting for a button press.
  useEffect(() => {
    if (!homeMode || !loaded || autoLocationStartedRef.current) return;
    autoLocationStartedRef.current = true;
    toggleGps();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [homeMode, loaded]);

  // Deep link support (?focus=<poiId>), e.g. from a Travi chat suggestion —
  // clears any active category filter so the target POI's marker exists.
  // Adjusts state during render (React's recommended pattern for resetting
  // state when a prop/derived value changes) rather than in an effect.
  const [prevFocusPoiId, setPrevFocusPoiId] = useState(focusPoiId);
  if (focusPoiId !== prevFocusPoiId) {
    setPrevFocusPoiId(focusPoiId);
    if (focusPoiId) setActiveCategory(null);
  }

  useEffect(() => {
    if (!focusPoiId || !loaded || !mapRef.current) return;
    if (markersByPoiId.current.has(focusPoiId)) focusPoi(focusPoiId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusPoiId, loaded, filtered]);

  // CSS-driven "fullscreen" (a fixed overlay covering the viewport) instead
  // of the native Fullscreen API — iOS Safari doesn't support
  // requestFullscreen() on arbitrary elements (only <video> can go native
  // fullscreen there), so relying on it meant this only worked on Android.
  // This approach works identically everywhere. Locks background scroll
  // while active and nudges Google Maps to redraw at its new size.
  useEffect(() => {
    if (mapRef.current) google.maps.event.trigger(mapRef.current, "resize");
    if (isFullscreen) {
      const prevOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prevOverflow;
      };
    }
  }, [isFullscreen]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setIsFullscreen(false);
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  function toggleFullscreen() {
    setIsFullscreen((v) => !v);
  }

  if (error) {
    return (
      <div className="rounded-lg border p-6 text-center text-sm" style={{ borderColor: "var(--primary)" }}>
        {error}. ודאו ש-NEXT_PUBLIC_GOOGLE_MAPS_API_KEY מוגדר.
      </div>
    );
  }

  if (homeMode) {
    return (
      <div className="fixed inset-x-0 bottom-0 top-14 z-0">
        <div ref={mapDivRef} className="h-full w-full" />

        <div className="absolute inset-x-0 top-0 z-10 flex gap-2 overflow-x-auto p-3">
          <button
            onClick={() => setActiveCategory(null)}
            className="shrink-0 rounded-full px-3 py-1.5 text-sm font-medium shadow-md"
            style={{
              background: activeCategory === null ? "var(--primary)" : "rgba(255,255,255,0.94)",
              color: activeCategory === null ? "white" : "var(--text)",
            }}
          >
            הכל
          </button>
          {categoryNames.map((name) => (
            <button
              key={name}
              onClick={() => setActiveCategory(name)}
              className="shrink-0 rounded-full px-3 py-1.5 text-sm font-medium shadow-md"
              style={{
                background: activeCategory === name ? "var(--primary)" : "rgba(255,255,255,0.94)",
                color: activeCategory === name ? "white" : "var(--text)",
              }}
            >
              {name}
            </button>
          ))}
          <button
            onClick={() => setHeatmapVisible((v) => !v)}
            className="shrink-0 rounded-full px-3 py-1.5 text-sm font-semibold shadow-md"
            style={{ background: heatmapVisible ? "#F97316" : "rgba(255,255,255,0.94)", color: heatmapVisible ? "white" : "#EA580C" }}
          >
            🔥 מפת חום
          </button>
          <button
            onClick={() => setTrailVisible((v) => !v)}
            className="shrink-0 rounded-full px-3 py-1.5 text-sm font-semibold shadow-md"
            style={{ background: trailVisible ? "#22C55E" : "rgba(255,255,255,0.94)", color: trailVisible ? "white" : "#16A34A" }}
          >
            🟢 איפה כבר הייתי
          </button>
        </div>

        {gpsError && (
          <div className="absolute inset-x-3 top-16 z-10 rounded-lg bg-white/95 p-2 text-center text-xs text-red-600 shadow-md">{gpsError}</div>
        )}

        {userPosition && (
          <button
            onClick={() => {
              mapRef.current?.panTo(userPosition);
              mapRef.current?.setZoom(16);
            }}
            className="absolute bottom-24 end-3 z-10 flex h-11 w-11 items-center justify-center rounded-full text-lg shadow-md"
            style={{ background: "white", color: "#4285F4" }}
            aria-label="למקם אותי מחדש"
            title="למקם אותי מחדש"
          >
            🎯
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 sm:h-[calc(100vh-140px)]">
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => setActiveCategory(null)}
          className="rounded-full border px-3 py-1 text-sm"
          style={{
            borderColor: "var(--primary)",
            background: activeCategory === null ? "var(--primary)" : "transparent",
            color: activeCategory === null ? "white" : "var(--text)",
          }}
        >
          הכל ({pointPois.length})
        </button>
        {categoryNames.map((name) => (
          <button
            key={name}
            onClick={() => setActiveCategory(name)}
            className="rounded-full border px-3 py-1 text-sm"
            style={{
              borderColor: "var(--primary)",
              background: activeCategory === name ? "var(--primary)" : "transparent",
              color: activeCategory === name ? "white" : "var(--text)",
            }}
          >
            {name}
          </button>
        ))}

        <button
          onClick={() => setHeatmapVisible((v) => !v)}
          className="ms-auto flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-semibold"
          style={{
            borderColor: "#F97316",
            background: heatmapVisible ? "#F97316" : "transparent",
            color: heatmapVisible ? "white" : "#EA580C",
          }}
          title="מפת חום — צפיפות נקודות באזור"
        >
          🔥 מפת חום
        </button>

        <button
          onClick={() => setTrailVisible((v) => !v)}
          className="flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-semibold"
          style={{
            borderColor: "#22C55E",
            background: trailVisible ? "#22C55E" : "transparent",
            color: trailVisible ? "white" : "#16A34A",
          }}
          title="הצגת/הסתרת המקומות שכבר הייתם בהם"
        >
          🟢 איפה כבר הייתי
        </button>

        <button
          onClick={toggleGps}
          className="flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold text-white"
          style={{ background: gpsActive ? "#4285F4" : "var(--primary)" }}
        >
          📍 {gpsActive ? "עוצרים מיקום" : "המיקום שלי"}
        </button>
      </div>
      {gpsActive && (
        <p className="text-xs opacity-60">
          🟢 המסלול שלכם נשמר ברקע כל עוד המסך פתוח — לחצו על &quot;איפה כבר הייתי&quot; כדי לראות אותו על המפה.
        </p>
      )}
      {gpsError && <p className="text-xs text-red-600">{gpsError}</p>}
      {routeError && <p className="text-xs text-red-600">{routeError}</p>}

      <div className="flex flex-1 flex-col gap-3 overflow-hidden sm:flex-row">
        <div
          className={
            isFullscreen
              ? "fixed inset-0 z-[200] h-screen w-screen"
              : "relative h-[50vh] w-full shrink-0 sm:h-auto sm:min-w-0 sm:flex-1"
          }
        >
          <div
            ref={mapDivRef}
            className="h-full w-full overflow-hidden"
            style={{ borderRadius: isFullscreen ? 0 : "var(--radius)", border: isFullscreen ? "none" : "1px solid var(--primary)" }}
          />
          <button
            onClick={toggleFullscreen}
            className="absolute start-2 top-2 z-10 flex h-9 w-9 items-center justify-center rounded-full text-lg shadow-md"
            style={{ background: "white", color: "var(--primary)" }}
            aria-label={isFullscreen ? "יציאה ממסך מלא" : "מסך מלא"}
            title={isFullscreen ? "יציאה ממסך מלא" : "מסך מלא"}
          >
            {isFullscreen ? "⤡" : "⤢"}
          </button>
        </div>
        <div
          className="hidden w-72 shrink-0 overflow-y-auto sm:block"
          style={{ borderRadius: "var(--radius)", border: "1px solid var(--primary)", background: "var(--surface)" }}
        >
          {gpsActive && userPosition && (
            <p className="border-b p-2 text-center text-xs opacity-60" style={{ borderColor: "color-mix(in srgb, var(--primary) 15%, transparent)" }}>
              ממוין לפי קרבה אליכם
            </p>
          )}
          {sortedList.map((poi) => renderListItem(poi))}
        </div>

        {/* Mobile-only: a normal section below the map, not an overlay on top of it. */}
        <div
          className="flex flex-col overflow-hidden sm:hidden"
          style={{ borderRadius: "var(--radius)", border: "1px solid var(--primary)", background: "var(--surface)" }}
        >
          <p className="border-b p-2 text-center text-xs font-semibold opacity-70" style={{ borderColor: "color-mix(in srgb, var(--primary) 15%, transparent)" }}>
            {sortedList.length} נקודות ברשימה
          </p>
          <div className="max-h-[45vh] overflow-y-auto">
            {gpsActive && userPosition && (
              <p className="border-b p-2 text-center text-xs opacity-60" style={{ borderColor: "color-mix(in srgb, var(--primary) 15%, transparent)" }}>
                ממוין לפי קרבה אליכם
              </p>
            )}
            {sortedList.map((poi) => renderListItem(poi))}
          </div>
        </div>
      </div>
    </div>
  );

  function renderListItem(poi: (typeof sortedList)[number]) {
    return (
      <div
        key={poi.id}
        onClick={() => focusPoi(poi.id)}
        className="flex w-full cursor-pointer items-center justify-between gap-2 border-b p-3 text-start text-sm"
        style={{
          borderColor: "color-mix(in srgb, var(--primary) 15%, transparent)",
          background: selectedPoiId === poi.id ? "var(--background)" : "transparent",
        }}
      >
        <span className="flex min-w-0 flex-col gap-0.5">
          <span className="flex items-center gap-2 font-medium">
            <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: poi.categoryColor }} />
            <span className="truncate">{poi.name}</span>
          </span>
          <span className="ps-4 text-xs opacity-60">
            {"distanceKm" in poi ? `${formatDistance((poi as unknown as { distanceKm: number }).distanceKm)} · ` : ""}
            {poi.areaName}
            {routeToPoiId === poi.id && " · 🧭 מסלול פעיל"}
          </span>
        </span>
        <span onClick={(e) => e.stopPropagation()}>
          <FavoriteButton poiId={poi.id} slug={slug} initialFavorited={favoritedIds.has(poi.id)} />
        </span>
      </div>
    );
  }
}
