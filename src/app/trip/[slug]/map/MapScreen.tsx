"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { MarkerClusterer } from "@googlemaps/markerclusterer";
import { useGoogleMaps, loadRoutesLibrary, loadPlacesLibrary } from "@/hooks/useGoogleMaps";
import type { FlatPoi } from "@/lib/data/pois";
import { FavoriteButton } from "@/components/FavoriteButton";
import { toggleFavorite, toggleWantsBooking, saveMapPin, deleteSavedMapPin } from "@/lib/actions/trip";
import { DECLUTTERED_MAP_STYLES, categoryMarkerIcon, currentLocationIcon } from "@/lib/mapStyles";
import { haversineKm } from "@/lib/geo";
import { recordLocationPing } from "@/lib/actions/location";
import { buildDensityGrid, colorForIntensity } from "@/lib/heatmap";
import { sunPosition, shadedSidePath } from "@/lib/shadow";
import { fetchStreetsInBounds, type StreetWay } from "@/lib/streetNetwork";
import { saveDestinationOffline, isDestinationSavedOffline, isOfflineStorageSupported } from "@/lib/offlineStore";

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

// The map opens at zoom 12 (see the Map constructor below) — a whole city
// fitting on screen, with many pins visible at once — where the default
// marker circle reads as a bit too big/cluttered. Shrinks slightly at that
// city-overview zoom band; once zoomed in past it (individual streets/pins),
// markers return to the normal, easier-to-tap size.
const CITY_VIEW_MAX_ZOOM = 14;
const MARKER_SCALE_CITY_VIEW = 12;
const MARKER_SCALE_DEFAULT = 15;
function markerScaleForZoom(zoom: number | undefined): number {
  return zoom !== undefined && zoom < CITY_VIEW_MAX_ZOOM ? MARKER_SCALE_CITY_VIEW : MARKER_SCALE_DEFAULT;
}

// Below this zoom the viewport covers too much ground for a reasonable
// Overpass query (and the map would be too cluttered with shade lines).
const SHADOW_MIN_ZOOM = 15;

// Fallback only, for the rare shape with no category color at all — every
// normal line/polygon renders in its own KML-derived category color instead.
const SHAPE_COLOR = "#7C3AED";

// Main-street lines always render in brand purple, not whatever color (often
// a generic blue) the KML happened to assign them.
const MAIN_STREET_PATTERN = /רחוב.*ראשי|ראשי.*רחוב|main street|main road/i;

const INFO_ACTION_BTN_STYLE =
  "cursor:pointer;border:1px solid #ddd;border-radius:999px;padding:4px 10px;font-size:12px;background:#fff;font-family:'Rubik',sans-serif;white-space:nowrap";

function infoWindowHtml(poi: FlatPoi, favorited: boolean, wantsBooking: boolean, preview: boolean): string {
  const photo = poi.photoUrl
    ? `<img src="${poi.photoUrl}" alt="" style="width:220px;height:120px;object-fit:cover;border-radius:8px;margin-bottom:6px" />`
    : "";
  const description = poi.description
    ? `<div style="font-size:12px;opacity:.75;margin-top:4px;max-width:220px">${poi.description.slice(0, 220)}</div>`
    : "";
  // Plain data-attributed buttons, not React — Google's InfoWindow content is
  // an HTML string, so clicks are wired up separately via the "domready"
  // event (see the infoWindow "domready" listener below). In preview mode
  // the popup is informational only — no personal-data actions to gate.
  const actions = preview
    ? ""
    : `<div style="display:flex;gap:6px;margin-top:8px">
    <button data-fav-btn data-poi-id="${poi.id}" style="${INFO_ACTION_BTN_STYLE}">${favorited ? "❤️ מועדפים" : "🤍 מועדפים"}</button>
    <button data-book-btn data-poi-id="${poi.id}" style="${INFO_ACTION_BTN_STYLE}">${wantsBooking ? "🎟️ ✓ נוסף להזמנה" : "🎟️ הוספה להזמנה"}</button>
  </div>`;
  return `<div style="font-family:'Rubik',sans-serif;padding:2px 4px">
    ${photo}
    <strong>${poi.name}</strong><br/>
    <span style="opacity:.6;font-size:12px">${poi.categoryName} · ${poi.areaName}</span>
    ${description}
    ${actions}
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
  savedPins = [],
  preview = false,
  autoLocate = true,
}: {
  pois: FlatPoi[];
  categoryNames: string[];
  slug: string;
  favoritedIds: Set<string>;
  logisticPins?: LogisticPin[];
  destinationId: string;
  initialTrail?: { lat: number; lng: number }[];
  /** Places a paying user chose to "save to the map" from Google's own POI
   * layer — personal to them, rendered as extra markers only on their map. */
  savedPins?: { id: string; placeId: string; name: string; lat: number; lng: number }[];
  /** Anonymous/unsubscribed visitors: the map itself still renders (pan/zoom/
   * markers all work), but every control that reads or writes personal data —
   * filters, layers, route mode, the POI list, favoriting — is grayed out and
   * routes to login instead of functioning. */
  preview?: boolean;
  /** Whether to auto-start GPS tracking and center on the user's real
   * position on load — false while the trip hasn't started yet (a future
   * flight date), since the traveler's actual current location is unrelated
   * to the destination they're planning; the map instead falls back to its
   * default destination-overview center/zoom. */
  autoLocate?: boolean;
}) {
  const router = useRouter();
  const { loaded, error } = useGoogleMaps();
  const searchParams = useSearchParams();
  const focusPoiId = searchParams.get("focus");
  const mapDivRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const clustererRef = useRef<MarkerClusterer | null>(null);
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);
  const markersByPoiId = useRef<Map<string, google.maps.Marker>>(new Map());
  const currentMarkerScaleRef = useRef<number>(MARKER_SCALE_DEFAULT);
  const shapesRef = useRef<(google.maps.Polygon | google.maps.Polyline)[]>([]);
  const userMarkerRef = useRef<google.maps.Marker | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const directionsServiceRef = useRef<google.maps.DirectionsService | null>(null);
  const directionsRendererRef = useRef<google.maps.DirectionsRenderer | null>(null);
  const trailPolylineRef = useRef<google.maps.Polyline | null>(null);
  const lastTrailPointRef = useRef<{ lat: number; lng: number; time: number } | null>(null);
  const heatmapCirclesRef = useRef<google.maps.Circle[]>([]);
  const shadowPolylinesRef = useRef<google.maps.Polyline[]>([]);
  const placesServiceRef = useRef<google.maps.places.PlacesService | null>(null);
  const savedPinMarkersRef = useRef<google.maps.Marker[]>([]);
  const showGooglePoisRef = useRef(false);
  const previewRef = useRef(preview);
  const autoLocationStartedRef = useRef(false);
  const pillRowRef = useRef<HTMLDivElement>(null);
  // Mirrors of state that marker click listeners need to read fresh without
  // forcing a full marker teardown/rebuild every time they change (markers
  // are only created once per filtered set — rebuilding them on every GPS
  // tick, which happens constantly now that location auto-starts, was the
  // source of laggy panning).
  const userPositionRef = useRef<{ lat: number; lng: number } | null>(null);
  const routeModeActiveRef = useRef(false);
  // Drive the info window's plain-HTML favorite/booking buttons — kept as
  // refs (not state) since toggling them is a direct DOM update, not a
  // React re-render, and the "domready" handler below is registered once.
  const favoritedIdsRef = useRef<Set<string>>(new Set(favoritedIds));
  const wantsBookingIdsRef = useRef<Set<string>>(new Set(pois.filter((p) => p.wantsBooking).map((p) => p.id)));

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
  const [shadowIsNight, setShadowIsNight] = useState(false);
  const [shadowTick, setShadowTick] = useState(0);
  const [listOpen, setListOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchNoResults, setSearchNoResults] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [offlineSaved, setOfflineSaved] = useState(false);
  const [offlineSaving, setOfflineSaving] = useState(false);
  const [offlineProgress, setOfflineProgress] = useState<{ done: number; total: number } | null>(null);
  const [routeModeActive, setRouteModeActive] = useState(false);
  const [showGooglePois, setShowGooglePois] = useState(false);
  const [mapType, setMapType] = useState<"roadmap" | "satellite">("roadmap");

  useEffect(() => {
    showGooglePoisRef.current = showGooglePois;
  }, [showGooglePois]);
  useEffect(() => {
    previewRef.current = preview;
  }, [preview]);

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

  // Tracks connectivity so the map can fall back to a clear "offline" state
  // — the live tiled map itself can never work without a network (no
  // supported way to legitimately cache Google's tiles for offline use),
  // but the points list + descriptions + any photos saved via "download for
  // offline" below still work fine without one.
  useEffect(() => {
    setIsOnline(navigator.onLine);
    isDestinationSavedOffline(slug).then(setOfflineSaved);
    const goOnline = () => setIsOnline(true);
    const goOffline = () => setIsOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, [slug]);

  // Offline is exactly when the points list matters most — force it open
  // (still collapsible back) instead of leaving it as a slim handle.
  useEffect(() => {
    if (!isOnline) setListOpen(true);
  }, [isOnline]);

  async function handleSaveOffline() {
    setOfflineSaving(true);
    setOfflineProgress({ done: 0, total: 0 });
    try {
      await saveDestinationOffline(
        slug,
        pois.map((p) => ({ id: p.id, photoUrl: p.photoUrl })),
        (done, total) => setOfflineProgress({ done, total })
      );
      setOfflineSaved(true);
    } catch {
      // best-effort — isOfflineStorageSupported already gates the button for
      // browsers that can't do this at all
    } finally {
      setOfflineSaving(false);
      setOfflineProgress(null);
    }
  }

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
      // Google's own Map/Satellite control is replaced by our own compact
      // toggle below — full control over its size/position, instead of the
      // native control crowding the top of a small mobile screen.
      mapTypeControl: false,
      // "greedy" lets a single finger pan/zoom the map immediately — Google's
      // default "cooperative" mode demands two fingers specifically so an
      // embedded map doesn't trap the page's scroll gesture, but that's not
      // a concern here since the map has its own fixed-height container.
      gestureHandling: "greedy",
      styles: DECLUTTERED_MAP_STYLES,
    });
    infoWindowRef.current = new google.maps.InfoWindow();

    // Wires up the plain-HTML favorite/booking buttons inside the info
    // window's content — fires on every open() (Maps rebuilds the content
    // DOM node each time), so registering it once here is enough.
    google.maps.event.addListener(infoWindowRef.current, "domready", () => {
      const favBtn = mapDivRef.current?.querySelector<HTMLButtonElement>("[data-fav-btn]");
      if (favBtn) {
        favBtn.onclick = (e) => {
          e.stopPropagation();
          const poiId = favBtn.getAttribute("data-poi-id")!;
          const nowFavorited = !favoritedIdsRef.current.has(poiId);
          if (nowFavorited) favoritedIdsRef.current.add(poiId);
          else favoritedIdsRef.current.delete(poiId);
          favBtn.textContent = nowFavorited ? "❤️ מועדפים" : "🤍 מועדפים";
          // Updates the marker's own icon immediately (yellow glyph fill for
          // favorites) instead of waiting for a full marker rebuild.
          const favoritedPoi = pointPoisById.get(poiId);
          const favoritedMarker = markersByPoiId.current.get(poiId);
          if (favoritedPoi && favoritedMarker) {
            favoritedMarker.setIcon(
              categoryMarkerIcon(favoritedPoi.categoryColor, favoritedPoi.categoryName, markerScaleForZoom(mapRef.current?.getZoom()), nowFavorited)
            );
          }
          toggleFavorite(poiId, slug);
        };
      }
      const bookBtn = mapDivRef.current?.querySelector<HTMLButtonElement>("[data-book-btn]");
      if (bookBtn) {
        bookBtn.onclick = (e) => {
          e.stopPropagation();
          const poiId = bookBtn.getAttribute("data-poi-id")!;
          const nowWants = !wantsBookingIdsRef.current.has(poiId);
          if (nowWants) wantsBookingIdsRef.current.add(poiId);
          else wantsBookingIdsRef.current.delete(poiId);
          bookBtn.textContent = nowWants ? "🎟️ ✓ נוסף להזמנה" : "🎟️ הוספה להזמנה";
          toggleWantsBooking(poiId, slug);
        };
      }
      const saveBtn = mapDivRef.current?.querySelector<HTMLButtonElement>("[data-save-pin-btn]");
      if (saveBtn) {
        saveBtn.onclick = (e) => {
          e.stopPropagation();
          saveBtn.disabled = true;
          saveBtn.textContent = "✓ נשמר למפה שלי";
          saveMapPin(destinationId, slug, {
            placeId: saveBtn.getAttribute("data-place-id")!,
            name: saveBtn.getAttribute("data-place-name")!,
            lat: Number(saveBtn.getAttribute("data-place-lat")),
            lng: Number(saveBtn.getAttribute("data-place-lng")),
          });
        };
      }
      const deletePinBtn = mapDivRef.current?.querySelector<HTMLButtonElement>("[data-delete-pin-btn]");
      if (deletePinBtn) {
        deletePinBtn.onclick = (e) => {
          e.stopPropagation();
          deleteSavedMapPin(deletePinBtn.getAttribute("data-pin-id")!, slug);
          infoWindowRef.current?.close();
        };
      }
    });

    // Clicking one of Google's own native POI icons (only visible when the
    // "show map tags" layer is toggled on) — offers to save it into this
    // user's personal pin layer instead of opening Google's own info card.
    // Only paying users can ever get here: previewGate() stops anonymous/
    // unsubscribed visitors from turning the layer on in the first place.
    google.maps.event.addListener(mapRef.current, "click", (e: google.maps.IconMouseEvent) => {
      if (!e.placeId || !showGooglePoisRef.current || previewRef.current) return;
      e.stop();
      loadPlacesLibrary()
        .then(() => {
          if (!placesServiceRef.current && mapRef.current) {
            placesServiceRef.current = new google.maps.places.PlacesService(mapRef.current);
          }
          placesServiceRef.current?.getDetails(
            { placeId: e.placeId!, fields: ["name", "geometry"] },
            (place, status) => {
              if (status !== google.maps.places.PlacesServiceStatus.OK || !place?.geometry?.location) return;
              const lat = place.geometry.location.lat();
              const lng = place.geometry.location.lng();
              const name = place.name ?? "מקום ללא שם";
              infoWindowRef.current?.setContent(
                `<div style="font-family:'Rubik',sans-serif;padding:2px 4px">
                  <strong>${name}</strong>
                  <div style="margin-top:8px">
                    <button data-save-pin-btn data-place-id="${e.placeId}" data-place-name="${name}" data-place-lat="${lat}" data-place-lng="${lng}" style="${INFO_ACTION_BTN_STYLE}">💾 שמירה למפה</button>
                  </div>
                </div>`
              );
              infoWindowRef.current?.setPosition({ lat, lng });
              infoWindowRef.current?.open({ map: mapRef.current! });
            }
          );
        })
        .catch(() => {});
    });
  }, [loaded, pointPois, slug, destinationId]);

  useEffect(() => {
    if (!loaded || !mapRef.current) return;
    mapRef.current.setMapTypeId(mapType);
  }, [loaded, mapType]);

  // Toggles Google's own POI/business icons on top of our own markers —
  // default off (DECLUTTERED_MAP_STYLES) so our pins don't compete with
  // Google's, switchable on to browse + save places we don't have curated.
  useEffect(() => {
    if (!loaded || !mapRef.current) return;
    mapRef.current.setOptions({ styles: showGooglePois ? [] : DECLUTTERED_MAP_STYLES });
  }, [loaded, showGooglePois]);

  // Renders this user's personal saved-pin layer (places they saved off the
  // native Google POI layer) as small bookmark-styled markers.
  useEffect(() => {
    if (!loaded || !mapRef.current) return;
    savedPinMarkersRef.current.forEach((m) => m.setMap(null));
    savedPinMarkersRef.current = [];

    savedPins.forEach((pin) => {
      const marker = new google.maps.Marker({
        position: { lat: pin.lat, lng: pin.lng },
        map: mapRef.current!,
        label: { text: "📌", fontSize: "16px" },
        title: pin.name,
        zIndex: 600,
      });
      marker.addListener("click", () => {
        infoWindowRef.current?.setContent(
          `<div style="font-family:'Rubik',sans-serif;padding:2px 4px">
            <strong>📌 ${pin.name}</strong>
            <div style="margin-top:8px">
              <button data-delete-pin-btn data-pin-id="${pin.id}" style="${INFO_ACTION_BTN_STYLE}">🗑️ הסרה מהמפה שלי</button>
            </div>
          </div>`
        );
        infoWindowRef.current?.open({ map: mapRef.current!, anchor: marker });
      });
      savedPinMarkersRef.current.push(marker);
    });
  }, [loaded, savedPins]);

  // Render line/polygon geometries (metro lines, walking routes, districts,
  // etc.) — each in its own category's color (poi.categoryColor, sourced
  // from the KML's styleUrl/IconStyle at import time — see
  // src/lib/kml/importToDb.ts), so e.g. every metro line shows in its real
  // line color instead of every shape rendering identically.
  useEffect(() => {
    if (!loaded || !mapRef.current) return;
    shapesRef.current.forEach((s) => s.setMap(null));
    shapesRef.current = [];

    shapePois.forEach((poi) => {
      const path = (poi.geometryCoords ?? []).map(([lng, lat]) => ({ lat, lng }));
      if (path.length < 2) return;
      // Prefers the placemark's own KML color (e.g. this exact metro line's
      // real line color) over the category's one shared swatch — several
      // differently-colored lines can otherwise be grouped in a single
      // category/folder (e.g. all under "מטרו") and would wrongly render
      // identically if only the category color were used. Main-street lines
      // are a deliberate exception — always our own brand purple regardless
      // of whatever color (usually blue) the KML assigned them.
      const color = MAIN_STREET_PATTERN.test(poi.categoryName) ? SHAPE_COLOR : poi.colorHex || poi.categoryColor || SHAPE_COLOR;
      if (poi.geometryType === "polygon") {
        const polygon = new google.maps.Polygon({
          paths: path,
          strokeColor: color,
          strokeWeight: 2,
          fillColor: color,
          fillOpacity: 0.15,
          map: mapRef.current!,
        });
        shapesRef.current.push(polygon);
      } else {
        const polyline = new google.maps.Polyline({
          path,
          strokeColor: color,
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
    const { azimuthDeg, elevationDeg } = sunPosition(new Date(), center.lat(), center.lng());
    // Below the horizon, there's no sun to cast a shadow on one particular
    // sidewalk — every street is uniformly in the dark, so draw the streets
    // themselves rather than an arbitrarily-picked "shaded side" offset line.
    const isNight = elevationDeg <= 0;
    setShadowIsNight(isNight);

    shadowPolylinesRef.current = shadowStreets.map(
      (path) =>
        new google.maps.Polyline({
          path: isNight ? path : shadedSidePath(path, azimuthDeg),
          strokeColor: "#111111",
          strokeWeight: isNight ? 5 : 4,
          strokeOpacity: isNight ? 0.5 : 0.35,
          clickable: false,
          zIndex: 40,
          map: mapRef.current!,
        })
    );
  }, [loaded, shadowVisible, shadowStreets, shadowTick]);

  // Recomputes the sun position on a timer while the layer is open, so the
  // shaded side actually rotates through the day instead of freezing at
  // whatever moment the layer happened to be toggled on.
  useEffect(() => {
    if (!shadowVisible) return;
    const id = setInterval(() => setShadowTick((t) => t + 1), 5 * 60 * 1000);
    return () => clearInterval(id);
  }, [shadowVisible]);

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

  // Free-text search against Google Places itself (not just our curated
  // POIs) — biased to the current viewport, panning/zooming to the top
  // result and offering the same "💾 שמירה למפה" info-window button already
  // wired up for the "tap a Google POI tag" flow above.
  function runPlaceSearch() {
    const query = searchQuery.trim();
    if (!query || !mapRef.current) return;
    setSearching(true);
    setSearchNoResults(false);
    loadPlacesLibrary()
      .then(() => {
        if (!placesServiceRef.current && mapRef.current) {
          placesServiceRef.current = new google.maps.places.PlacesService(mapRef.current);
        }
        placesServiceRef.current?.textSearch(
          { query, bounds: mapRef.current?.getBounds() ?? undefined },
          (results, status) => {
            setSearching(false);
            const top = results?.[0];
            const location = top?.geometry?.location;
            if (status !== google.maps.places.PlacesServiceStatus.OK || !top || !location || !top.place_id) {
              setSearchNoResults(true);
              return;
            }
            const lat = location.lat();
            const lng = location.lng();
            const name = top.name ?? query;
            mapRef.current!.panTo({ lat, lng });
            mapRef.current!.setZoom(16);
            infoWindowRef.current?.setContent(
              `<div style="font-family:'Rubik',sans-serif;padding:2px 4px">
                <strong>${name}</strong>
                ${top.formatted_address ? `<div style="font-size:12px;opacity:.6;margin-top:2px">${top.formatted_address}</div>` : ""}
                <div style="margin-top:8px">
                  <button data-save-pin-btn data-place-id="${top.place_id}" data-place-name="${name}" data-place-lat="${lat}" data-place-lng="${lng}" style="${INFO_ACTION_BTN_STYLE}">💾 שמירה למפה</button>
                </div>
              </div>`
            );
            infoWindowRef.current?.setPosition({ lat, lng });
            infoWindowRef.current?.open({ map: mapRef.current! });
            setSearchOpen(false);
          }
        );
      })
      .catch(() => setSearching(false));
  }

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
    infoWindowRef.current?.setContent(
      infoWindowHtml(poi, favoritedIdsRef.current.has(poi.id), wantsBookingIdsRef.current.has(poi.id), preview)
    );
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

    const initialScale = markerScaleForZoom(mapRef.current.getZoom());
    currentMarkerScaleRef.current = initialScale;
    const markers = filtered.map((poi) => {
      const marker = new google.maps.Marker({
        position: { lat: poi.lat, lng: poi.lng },
        title: poi.name,
        icon: categoryMarkerIcon(poi.categoryColor, poi.categoryName, initialScale, favoritedIdsRef.current.has(poi.id)),
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

      // Only touch marker icons when the zoom actually crossed the
      // city-view threshold — re-setting every marker's icon on every idle
      // event (drag, pan) would be wasted work and risks reintroducing the
      // panning lag noted above.
      const nextScale = markerScaleForZoom(zoom);
      const scaleChanged = nextScale !== currentMarkerScaleRef.current;
      if (scaleChanged) currentMarkerScaleRef.current = nextScale;

      markersByPoiId.current.forEach((marker, id) => {
        const position = marker.getPosition();
        // O(1) lookup — with 1000+ points this ran as an O(n) .find() per
        // marker on every drag/zoom idle event, which was the real source
        // of the reported lag right after panning the map.
        const poi = showLabels && position && bounds!.contains(position) ? pointPoisById.get(id) : null;
        marker.setLabel(
          poi ? { text: poi.name, color: "#FFFFFF", fontSize: "11px", fontWeight: "700", className: "poi-marker-label" } : ""
        );
        if (scaleChanged) {
          const fullPoi = pointPoisById.get(id);
          if (fullPoi) {
            marker.setIcon(categoryMarkerIcon(fullPoi.categoryColor, fullPoi.categoryName, nextScale, favoritedIdsRef.current.has(id)));
          }
        }
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
  // instead of waiting for a button press, since this map is the trip's home
  // screen — but only once the trip has actually started (see `autoLocate`);
  // before then the traveler's real position is somewhere else entirely, so
  // the map instead keeps its default center/zoom over the destination.
  useEffect(() => {
    if (!loaded || preview || !autoLocate || autoLocationStartedRef.current) return;
    autoLocationStartedRef.current = true;
    toggleGps();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, preview, autoLocate]);

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

  // Preview-mode controls stay visible (grayed) but route to the pricing
  // page instead of doing anything — anonymous visitors see what upgrading
  // unlocks before being asked to create an account, rather than being sent
  // straight to a login form.
  function previewGate(action: () => void) {
    return () => {
      if (preview) {
        router.push("/pricing");
        return;
      }
      action();
    };
  }
  const previewDim: React.CSSProperties = preview ? { opacity: 0.45, filter: "grayscale(1)" } : {};

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
      className="map-screen-container fixed inset-x-0 bottom-0 top-14 z-0 sm:relative sm:inset-auto sm:h-[calc(100vh-140px)] sm:overflow-hidden sm:rounded-[var(--radius)] sm:border"
      style={{ borderColor: "var(--primary)" }}
    >
      <div ref={mapDivRef} className="h-full w-full" />

      {preview && (
        <div
          className="pointer-events-none absolute inset-x-0 bottom-16 z-30 flex justify-center px-3 sm:bottom-4"
        >
          <Link
            href="/pricing"
            className="pointer-events-auto flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold text-white shadow-lg"
            style={{ background: "linear-gradient(135deg, #7C3AED, #EC4899)" }}
          >
            🔓 תצוגה מקדימה — שדרגו את החבילה כדי לפתוח את כל התכונות
          </Link>
        </div>
      )}

      {/* One single row for both breakpoints: our own compact Map/Satellite
       * toggle (replacing Google's native control) sits shrink-0 at the
       * physical left, and the filter-pill strip fills the remaining width
       * right beside it — merged onto the same line so together they take
       * only one row's worth of height off the top of the map instead of
       * two stacked rows. `dir="ltr"` pins the toggle as the visually
       * leftmost item with the filters flowing to its right regardless of
       * the page's own RTL direction (a plain RTL flex row would put the
       * first DOM child — the toggle — on the right instead); the Hebrew
       * pill labels still render correctly since dir only affects layout
       * order, not a leaf element's own text shaping. Small arrow buttons
       * flank the pill strip as an alternative to dragging it; the strip's
       * own native scrollbar is hidden (.no-scrollbar) so it just feels
       * like a swipeable strip. */}
      <div dir="ltr" className="absolute inset-x-0 top-6 z-10 flex items-center gap-1 px-2 sm:top-2">
        <div className="flex shrink-0 gap-0.5 rounded-full bg-white/95 p-0.5 text-[11px] font-semibold shadow-md sm:text-xs">
          <button
            onClick={() => setMapType("roadmap")}
            className="rounded-full px-2 py-0.5 sm:px-2.5 sm:py-1"
            style={{ background: mapType === "roadmap" ? "var(--primary)" : "transparent", color: mapType === "roadmap" ? "white" : "var(--text)" }}
          >
            מפה
          </button>
          <button
            onClick={() => setMapType("satellite")}
            className="rounded-full px-2 py-0.5 sm:px-2.5 sm:py-1"
            style={{ background: mapType === "satellite" ? "var(--primary)" : "transparent", color: mapType === "satellite" ? "white" : "var(--text)" }}
          >
            לוויין
          </button>
        </div>
        <button
          onClick={previewGate(() => setSearchOpen((v) => !v))}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm shadow-md"
          style={{ background: searchOpen ? "var(--primary)" : "rgba(255,255,255,0.94)", color: searchOpen ? "white" : "var(--text)", ...previewDim }}
          aria-label="חיפוש מקום בגוגל מפות"
        >
          🔍
        </button>
        {searchOpen ? (
          <div className="flex flex-1 items-center gap-1 rounded-full bg-white/95 p-1 shadow-md">
            <input
              autoFocus
              dir="rtl"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setSearchNoResults(false);
              }}
              onKeyDown={(e) => e.key === "Enter" && runPlaceSearch()}
              placeholder="חיפוש מקום בגוגל מפות..."
              className="min-w-0 flex-1 bg-transparent px-2 text-sm outline-none"
              style={{ color: "var(--text)" }}
            />
            <button
              onClick={runPlaceSearch}
              disabled={searching || !searchQuery.trim()}
              className="shrink-0 rounded-full px-3 py-1 text-xs font-semibold text-white disabled:opacity-50"
              style={{ background: "var(--primary)" }}
            >
              {searching ? "…" : "חיפוש"}
            </button>
            <button
              onClick={() => {
                setSearchOpen(false);
                setSearchQuery("");
                setSearchNoResults(false);
              }}
              className="shrink-0 px-1 text-lg opacity-50 hover:opacity-100"
              aria-label="סגירת חיפוש"
            >
              ✕
            </button>
          </div>
        ) : (
          <>
            <button
              onClick={() => pillRowRef.current?.scrollBy({ left: -160, behavior: "smooth" })}
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-sm shadow-md"
              style={{ background: "rgba(255,255,255,0.94)", color: "var(--text)" }}
              aria-label="גלילה שמאלה"
            >
              ‹
            </button>
            <div ref={pillRowRef} dir="rtl" className="no-scrollbar flex flex-1 gap-1 overflow-x-auto scroll-smooth p-1">
        <button
          onClick={previewGate(() => setActiveCategory(null))}
          className="shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium shadow-md sm:px-3 sm:py-1.5 sm:text-sm"
          style={{
            background: activeCategory === null ? "var(--primary)" : "rgba(255,255,255,0.94)",
            color: activeCategory === null ? "white" : "var(--text)",
            ...previewDim,
          }}
        >
          הכל
        </button>
        {categoryNames.map((name) => (
          <button
            key={name}
            onClick={previewGate(() => setActiveCategory(name))}
            className="shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium shadow-md sm:px-3 sm:py-1.5 sm:text-sm"
            style={{
              background: activeCategory === name ? "var(--primary)" : "rgba(255,255,255,0.94)",
              color: activeCategory === name ? "white" : "var(--text)",
              ...previewDim,
            }}
          >
            {name}
          </button>
        ))}
        <button
          onClick={previewGate(() => setHeatmapVisible((v) => !v))}
          className="shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold shadow-md sm:px-3 sm:py-1.5 sm:text-sm"
          style={{ background: heatmapVisible ? "#F97316" : "rgba(255,255,255,0.94)", color: heatmapVisible ? "white" : "#EA580C", ...previewDim }}
        >
          🔥 מפת חום
        </button>
        <button
          onClick={previewGate(() => setTrailVisible((v) => !v))}
          className="shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold shadow-md sm:px-3 sm:py-1.5 sm:text-sm"
          style={{ background: trailVisible ? "#22C55E" : "rgba(255,255,255,0.94)", color: trailVisible ? "white" : "#16A34A", ...previewDim }}
        >
          🟢 איפה כבר הייתי
        </button>
        <button
          onClick={previewGate(() => setShadowVisible((v) => !v))}
          className="shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold shadow-md sm:px-3 sm:py-1.5 sm:text-sm"
          style={{ background: shadowVisible ? "#111111" : "rgba(255,255,255,0.94)", color: shadowVisible ? "white" : "#374151", ...previewDim }}
          title="הערכה גסה — לפי כיוון הרחוב ומיקום השמש, לא נתוני גובה מבנים אמיתיים"
        >
          {shadowVisible && shadowLoading
            ? "🌑 טוען..."
            : shadowVisible && shadowIsNight
              ? "🌙 לילה — הכל מוצל"
              : "🌑 צל"}
        </button>
        </div>
            <button
              onClick={() => pillRowRef.current?.scrollBy({ left: 160, behavior: "smooth" })}
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-sm shadow-md"
              style={{ background: "rgba(255,255,255,0.94)", color: "var(--text)" }}
              aria-label="גלילה ימינה"
            >
              ›
            </button>
          </>
        )}
      </div>

      {searchNoResults && (
        <div className="absolute inset-x-3 top-16 z-10 rounded-lg bg-white/95 p-2 text-center text-xs text-red-600 shadow-md">
          לא נמצאו תוצאות לחיפוש הזה
        </div>
      )}

      {!isOnline && (
        <div className="absolute inset-x-3 top-16 z-10 rounded-lg bg-white/95 p-2.5 text-center text-xs font-semibold shadow-md" style={{ color: "#92400E" }}>
          📡 אין חיבור לאינטרנט — המפה החיה דורשת רשת, מוצגת הרשימה השמורה בלבד
        </div>
      )}

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
          onClick={previewGate(() => setRouteModeActive((v) => !v))}
          className="flex h-11 w-11 items-center justify-center rounded-full shadow-md"
          style={{ background: routeModeActive ? "#4285F4" : "white", color: routeModeActive ? "white" : "#4285F4", ...previewDim }}
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

      {/* Toggles Google's own POI/business tags on top of our own markers —
       * off by default so our pins don't compete with Google's; only paying
       * users can turn it on (previewGate routes anon/free visitors to
       * pricing instead). Mirrors the route-mode button's position/style on
       * the opposite side. */}
      <div className="group absolute bottom-36 start-3 z-10 sm:bottom-6">
        <button
          onClick={previewGate(() => setShowGooglePois((v) => !v))}
          className="flex h-11 w-11 items-center justify-center rounded-full shadow-md"
          style={{ background: showGooglePois ? "#4285F4" : "white", color: showGooglePois ? "white" : "#4285F4", ...previewDim }}
          aria-label="הצגת תגיות גוגל מפות"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20.59 13.41 12 22l-8.59-8.59a2 2 0 0 1 0-2.82l7.17-7.17a2 2 0 0 1 2.82 0l7.19 7.17a2 2 0 0 1 0 2.82Z" />
            <circle cx="12" cy="8" r="1.6" fill="currentColor" stroke="none" />
          </svg>
        </button>
        <span
          className="pointer-events-none absolute bottom-full start-0 mb-2 whitespace-nowrap rounded-lg px-2.5 py-1.5 text-xs font-semibold text-white opacity-0 shadow-md transition-opacity group-hover:opacity-100"
          style={{ background: "#111827" }}
        >
          {showGooglePois ? "לחצו על מקום כדי לשמור למפה שלכם" : "הצגת תגיות גוגל מפות"}
        </span>
      </div>

      {/* Places list — reachable by scrolling/tapping this sheet, not by
       * dragging the map. Collapsed to a slim handle by default; expands to
       * show the full clickable list, same behavior as the old split-view
       * map screen's sidebar list. */}
      {/* Mobile bottom offset uses --mobile-nav-height, the bottom nav's own
       * *measured* height (see AppSidebar's ResizeObserver) rather than a
       * hardcoded guess — env(safe-area-inset-bottom) is already included
       * in that measurement since it's real padding inside the nav, so it
       * isn't added again here. This sits the list flush against the nav on
       * any device, with no gap and no overlap. */}
      <div
        className="absolute inset-x-0 bottom-[var(--mobile-nav-height,3.5rem)] z-20 flex flex-col overflow-hidden rounded-t-2xl shadow-[0_-4px_16px_rgba(0,0,0,0.15)] transition-[height] duration-200 sm:inset-x-auto sm:bottom-4 sm:left-1/2 sm:w-80 sm:-translate-x-1/2 sm:rounded-2xl"
        style={{ background: "var(--surface)", height: listOpen ? "70vh" : "3.5rem", ...previewDim }}
      >
        <div className="flex shrink-0 items-center gap-2 px-4 py-3 text-sm font-semibold">
          <button onClick={previewGate(() => setListOpen((v) => !v))} className="flex flex-1 items-center gap-2 text-start">
            <span>📋 {sortedList.length} נקודות ברשימה{gpsActive && userPosition ? " · ממוין לפי קרבה" : ""}</span>
          </button>
          {isOfflineStorageSupported() && (
            <button
              onClick={previewGate(handleSaveOffline)}
              disabled={offlineSaving}
              className="shrink-0 rounded-full px-2 py-1 text-[11px] font-semibold opacity-70 hover:opacity-100 disabled:opacity-50"
              style={{ background: offlineSaved ? "color-mix(in srgb, #16A34A 12%, transparent)" : "transparent", color: offlineSaved ? "#16A34A" : "var(--text)" }}
              title="שמירת הנקודות והתמונות לשימוש אופליין"
            >
              {offlineSaving
                ? `📥 ${offlineProgress?.done ?? 0}/${offlineProgress?.total ?? 0}`
                : offlineSaved
                  ? "✓ נשמר אופליין"
                  : "📥 שמירה אופליין"}
            </button>
          )}
          <button onClick={previewGate(() => setListOpen((v) => !v))} className="shrink-0 text-xs opacity-60">
            {listOpen ? "▼" : "▲"}
          </button>
        </div>
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
