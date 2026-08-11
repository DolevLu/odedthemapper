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
import { sunAzimuthDeg, shadedSidePath } from "@/lib/shadow";
import { fetchStreetsInBounds, type StreetWay } from "@/lib/streetNetwork";

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

// Below this zoom the viewport covers too much ground for a reasonable
// Overpass query (and the map would be too cluttered with shade lines).
const SHADOW_MIN_ZOOM = 15;

// Walking routes / district lines always render in the same brand purple,
// regardless of whatever color the KML import happened to assign.
const SHAPE_COLOR = "#7C3AED";

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
}: {
  pois: FlatPoi[];
  categoryNames: string[];
  slug: string;
  favoritedIds: Set<string>;
  logisticPins?: LogisticPin[];
  destinationId: string;
  initialTrail?: { lat: number; lng: number }[];
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
  const shadowPolylinesRef = useRef<google.maps.Polyline[]>([]);
  const autoLocationStartedRef = useRef(false);
  const pillRowRef = useRef<HTMLDivElement>(null);
  // Mirrors of state that marker click listeners need to read fresh without
  // forcing a full marker teardown/rebuild every time they change (markers
  // are only created once per filtered set — rebuilding them on every GPS
  // tick, which happens constantly now that location auto-starts, was the
  // source of laggy panning).
  const userPositionRef = useRef<{ lat: number; lng: number } | null>(null);
  const routeModeActiveRef = useRef(false);

  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [selectedPoiId, setSelectedPoiId] = useState<string | null>(null);
  const [gpsActive, setGpsActive] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [userPosition, setUserPosition] = useState<{ lat: number; lng: number } | null>(null);
  const [routeToPoiId, setRouteToPoiId] = useState<string | null>(null);
  const [routeError, setRouteError] = useState<string | null>(null);
  const [trailVisible, setTrailVisible] = useState(false);
  const [trailPoints, setTrailPoints] = useState(initialTrail);
  const [heatmapVisible, setHeatmapVisible] = useState(false);
  const [shadowVisible, setShadowVisible] = useState(false);
  const [shadowStreets, setShadowStreets] = useState<StreetWay[]>([]);
  const [shadowLoading, setShadowLoading] = useState(false);
  const [shadowError, setShadowError] = useState<string | null>(null);
  const [listOpen, setListOpen] = useState(false);
  const [routeModeActive, setRouteModeActive] = useState(false);

  useEffect(() => {
    userPositionRef.current = userPosition;
  }, [userPosition]);
  useEffect(() => {
    routeModeActiveRef.current = routeModeActive;
  }, [routeModeActive]);

  const pointPois = useMemo(() => pois.filter((p) => p.geometryType === "point"), [pois]);
  const pointPoisById = useMemo(() => new Map(pointPois.map((p) => [p.id, p])), [pointPois]);
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
          strokeColor: SHAPE_COLOR,
          strokeWeight: 2,
          fillColor: SHAPE_COLOR,
          fillOpacity: 0.15,
          map: mapRef.current!,
        });
        shapesRef.current.push(polygon);
      } else {
        const polyline = new google.maps.Polyline({
          path,
          strokeColor: SHAPE_COLOR,
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

  // Approximate "which side of the street is shaded" — a heuristic (street
  // bearing vs. real sun position for the map's current center/time), not a
  // true building-height shadow simulation, since no free worldwide
  // building-height API exists. Street geometry comes from OpenStreetMap's
  // Overpass API for whatever's currently on screen, refreshed as you pan —
  // Google Maps JS API has no way to enumerate the road network itself.
  useEffect(() => {
    if (!loaded || !mapRef.current || !shadowVisible) return;
    const map = mapRef.current;

    async function refreshStreets() {
      const zoom = map.getZoom() ?? 0;
      const bounds = map.getBounds();
      if (zoom < SHADOW_MIN_ZOOM || !bounds) {
        setShadowStreets([]);
        setShadowError(zoom < SHADOW_MIN_ZOOM ? "התקרבו יותר כדי לראות צל רחובות" : null);
        return;
      }
      setShadowLoading(true);
      setShadowError(null);
      try {
        const ne = bounds.getNorthEast();
        const sw = bounds.getSouthWest();
        const streets = await fetchStreetsInBounds({ south: sw.lat(), west: sw.lng(), north: ne.lat(), east: ne.lng() });
        setShadowStreets(streets);
      } catch {
        setShadowError("לא הצלחנו לטעון רחובות — נסו שוב");
      } finally {
        setShadowLoading(false);
      }
    }

    refreshStreets();
    let debounce: ReturnType<typeof setTimeout> | null = null;
    const listener = map.addListener("idle", () => {
      if (debounce) clearTimeout(debounce);
      debounce = setTimeout(refreshStreets, 800);
    });
    return () => {
      listener.remove();
      if (debounce) clearTimeout(debounce);
    };
  }, [loaded, shadowVisible]);

  // Renders the fetched streets as shaded-side offset lines, recomputing the
  // sun's position each time the street set changes.
  useEffect(() => {
    if (!loaded || !mapRef.current) return;
    shadowPolylinesRef.current.forEach((p) => p.setMap(null));
    shadowPolylinesRef.current = [];
    if (!shadowVisible || shadowStreets.length === 0) return;

    const center = mapRef.current.getCenter();
    if (!center) return;
    const sunAzimuth = sunAzimuthDeg(new Date(), center.lat(), center.lng());

    shadowPolylinesRef.current = shadowStreets.map(
      (path) =>
        new google.maps.Polyline({
          path: shadedSidePath(path, sunAzimuth),
          strokeColor: "#111111",
          strokeWeight: 4,
          strokeOpacity: 0.35,
          clickable: false,
          zIndex: 40,
          map: mapRef.current!,
        })
    );
  }, [loaded, shadowVisible, shadowStreets]);

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
    const origin = userPositionRef.current;
    if (!origin || !mapRef.current) return;
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
        origin,
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

  // Clicking a point only opens its info popup by default — a route is only
  // drawn when route mode is explicitly on (floating button), so an ordinary
  // click never surprises you with a walking route you didn't ask for.
  function openPoi(poi: FlatPoi, marker: google.maps.Marker) {
    setSelectedPoiId(poi.id);
    infoWindowRef.current?.setContent(infoWindowHtml(poi));
    infoWindowRef.current?.open({ map: mapRef.current!, anchor: marker });
    if (routeModeActiveRef.current) {
      if (userPositionRef.current) drawRouteTo(poi);
      else setRouteError("אין עדיין מיקום זמין ליצירת מסלול");
    }
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
    // gpsActive/userPosition are intentionally excluded — openPoi/drawRouteTo
    // read them from refs, so markers don't need rebuilding on every GPS
    // tick (that was the actual cause of laggy panning: a full marker
    // teardown/rebuild every time the position update, which now fires
    // constantly since location tracking auto-starts).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, filtered, heatmapVisible]);

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
        // O(1) lookup — with 1000+ points this ran as an O(n) .find() per
        // marker on every drag/zoom idle event, which was the real source
        // of the reported lag right after panning the map.
        const poi = showLabels && position && bounds!.contains(position) ? pointPoisById.get(id) : null;
        marker.setLabel(poi ? { text: poi.name, color: "#1F2937", fontSize: "11px", fontWeight: "700" } : "");
      });
    }

    const listener = map.addListener("idle", updateLabels);
    return () => listener.remove();
  }, [loaded, pointPoisById]);

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

  // Google-Maps-app-style default: location tracking just starts on its own
  // instead of waiting for a button press, since this map is now the trip's
  // home screen.
  useEffect(() => {
    if (!loaded || autoLocationStartedRef.current) return;
    autoLocationStartedRef.current = true;
    toggleGps();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded]);

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

  if (error) {
    return (
      <div className="rounded-lg border p-6 text-center text-sm" style={{ borderColor: "var(--primary)" }}>
        {error}. ודאו ש-NEXT_PUBLIC_GOOGLE_MAPS_API_KEY מוגדר.
      </div>
    );
  }

  return (
    // Mobile: true edge-to-edge fullscreen (fixed to the viewport, below the
    // header, no sidebar to preserve). Desktop: a normal in-flow content
    // card next to the sidebar — position:fixed on desktop was covering the
    // wrong region and made the sidebar look like it had disappeared.
    <div
      className="fixed inset-x-0 bottom-0 top-14 z-0 sm:relative sm:inset-auto sm:h-[calc(100vh-140px)] sm:overflow-hidden sm:rounded-[var(--radius)] sm:border"
      style={{ borderColor: "var(--primary)" }}
    >
      <div ref={mapDivRef} className="h-full w-full" />

      {/* Mobile: top-12 clears Google's own Map/Satellite type-control
       * button, which renders near the top of the map div and would
       * otherwise sit directly under this row. Desktop: instead sits
       * beside that control on the same line — using physical left/right
       * (not RTL start/end) since Google pins its own control to the
       * physical top-left corner regardless of page direction. Small arrow
       * buttons flank the pill row as an alternative to dragging it; the
       * row's own native scrollbar is hidden (.no-scrollbar) so it just
       * feels like a swipeable strip. */}
      <div className="absolute inset-x-0 top-12 z-10 flex items-center gap-1 px-2 sm:inset-x-auto sm:top-2 sm:left-48 sm:right-2">
        <button
          onClick={() => pillRowRef.current?.scrollBy({ left: -160, behavior: "smooth" })}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm shadow-md"
          style={{ background: "rgba(255,255,255,0.94)", color: "var(--text)" }}
          aria-label="גלילה שמאלה"
        >
          ‹
        </button>
        <div ref={pillRowRef} className="no-scrollbar flex flex-1 gap-2 overflow-x-auto scroll-smooth p-1">
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
        <button
          onClick={() => setShadowVisible((v) => !v)}
          className="shrink-0 rounded-full px-3 py-1.5 text-sm font-semibold shadow-md"
          style={{ background: shadowVisible ? "#111111" : "rgba(255,255,255,0.94)", color: shadowVisible ? "white" : "#374151" }}
          title="הערכה גסה — לפי כיוון הרחוב ומיקום השמש, לא נתוני גובה מבנים אמיתיים"
        >
          🌑 {shadowVisible && shadowLoading ? "טוען..." : "צל"}
        </button>
        </div>
        <button
          onClick={() => pillRowRef.current?.scrollBy({ left: 160, behavior: "smooth" })}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm shadow-md"
          style={{ background: "rgba(255,255,255,0.94)", color: "var(--text)" }}
          aria-label="גלילה ימינה"
        >
          ›
        </button>
      </div>

      {gpsError && (
        <div className="absolute inset-x-3 top-28 z-10 rounded-lg bg-white/95 p-2 text-center text-xs text-red-600 shadow-md">{gpsError}</div>
      )}
      {routeError && (
        <div className="absolute inset-x-3 top-28 z-10 rounded-lg bg-white/95 p-2 text-center text-xs text-red-600 shadow-md">{routeError}</div>
      )}
      {shadowVisible && shadowError && (
        <div className="absolute inset-x-3 top-40 z-10 rounded-lg bg-white/95 p-2 text-center text-xs text-red-600 shadow-md">{shadowError}</div>
      )}

      {/* Route mode: off by default, so clicking a point just opens its
       * info popup. Toggle this on, then click a point to draw a walking
       * route to it. group-hover drives a custom tooltip bubble instead of
       * relying on the native title tooltip. */}
      <div className="group absolute bottom-36 end-3 z-10 sm:bottom-6">
        <button
          onClick={() => setRouteModeActive((v) => !v)}
          className="flex h-11 w-11 items-center justify-center rounded-full shadow-md"
          style={{ background: routeModeActive ? "#4285F4" : "white", color: routeModeActive ? "white" : "#4285F4" }}
          aria-label="מצב מסלול הליכה"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle cx="4" cy="20" r="2" fill="currentColor" stroke="none" />
            <circle cx="20" cy="4" r="2" fill="currentColor" stroke="none" />
            <path d="M4 18c0-5 6-3 6-8s6-3 6-6" strokeDasharray="2.5 2.5" />
          </svg>
        </button>
        <span
          className="pointer-events-none absolute bottom-full end-0 mb-2 whitespace-nowrap rounded-lg px-2.5 py-1.5 text-xs font-semibold text-white opacity-0 shadow-md transition-opacity group-hover:opacity-100"
          style={{ background: "#111827" }}
        >
          {routeModeActive ? "מצב מסלול פעיל — לחצו על נקודה" : "הפעלת מצב מסלול הליכה"}
        </span>
      </div>

      {/* Places list — reachable by scrolling/tapping this sheet, not by
       * dragging the map. Collapsed to a slim handle by default; expands to
       * show the full clickable list, same behavior as the old split-view
       * map screen's sidebar list. */}
      <div
        className="absolute inset-x-0 bottom-16 z-20 flex flex-col overflow-hidden rounded-t-2xl shadow-[0_-4px_16px_rgba(0,0,0,0.15)] transition-[height] duration-200 sm:inset-x-auto sm:bottom-4 sm:left-1/2 sm:w-80 sm:-translate-x-1/2 sm:rounded-2xl"
        style={{ background: "var(--surface)", height: listOpen ? "70vh" : "3.5rem" }}
      >
        <button
          onClick={() => setListOpen((v) => !v)}
          className="flex shrink-0 items-center justify-between gap-2 px-4 py-3 text-sm font-semibold"
        >
          <span>📋 {sortedList.length} נקודות ברשימה{gpsActive && userPosition ? " · ממוין לפי קרבה" : ""}</span>
          <span className="text-xs opacity-60">{listOpen ? "▼" : "▲"}</span>
        </button>
        {listOpen && <div className="flex-1 overflow-y-auto overscroll-contain">{sortedList.map((poi) => renderListItem(poi))}</div>}
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
