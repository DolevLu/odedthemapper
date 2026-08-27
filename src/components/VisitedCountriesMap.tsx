"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useGoogleMaps } from "@/hooks/useGoogleMaps";
import { toggleVisitedCountry, uploadCountryPhoto, deleteCountryPhoto, type CountryPhoto } from "@/lib/actions/visitedCountries";
import { WORLD_COUNTRIES, flagEmoji } from "@/lib/worldCountries";

// Below this zoom the pins are too small/numerous on screen for photo
// thumbnails to read as anything but noise — flags stay flags until you've
// zoomed in on roughly a single country/region.
const PHOTO_CLUSTER_ZOOM = 3;

// Simplified (110m resolution) world country borders, stripped down to just
// {iso_a2, name} + geometry — see how it was generated in this session's
// notes. ISO_A2 matches WORLD_COUNTRIES' own `code` field directly.
const WORLD_BORDERS_URL = "/data/world-countries.geojson";

const VISITED_FILL = "#22C55E";
const VISITED_STROKE = "#16A34A";
const UNVISITED_FILL = "#D1D5DB";
const UNVISITED_STROKE = "#9CA3AF";

const CLUSTER_LAYOUT = [
  { x: 0, y: 0, r: 4 },
  { x: 20, y: -6, r: -8 },
  { x: -18, y: 10, r: 10 },
  { x: 14, y: 16, r: -5 },
];

const CLUSTER_SIZE = 76;
const THUMB_SIZE = 30;

/** A small "photo pile" overlay — up to 4 scrapbook-style tilted thumbnails
 * as real DOM <img> elements positioned over the map. A marker's `icon` can
 * only be a single flat image (an SVG data: URI with <image href="..."> tags
 * pointing at external photos does NOT render them — browsers refuse to
 * fetch external resources referenced from inside a data: URI SVG used as an
 * <img> src, as a tracking/CORS-bypass mitigation), so this uses a real
 * google.maps.OverlayView positioned each frame instead. Must be defined
 * inside a function called after the Maps JS API has loaded, since it
 * extends google.maps.OverlayView. */
function createPhotoClusterOverlay(
  map: google.maps.Map,
  position: google.maps.LatLngLiteral,
  photos: CountryPhoto[],
  title: string,
  onClick: () => void
): google.maps.OverlayView {
  class PhotoClusterOverlay extends google.maps.OverlayView {
    div: HTMLDivElement | null = null;

    onAdd() {
      const div = document.createElement("div");
      div.style.position = "absolute";
      div.style.width = `${CLUSTER_SIZE}px`;
      div.style.height = `${CLUSTER_SIZE}px`;
      div.style.cursor = "pointer";
      div.title = title;

      photos.slice(0, 4).forEach((p, i) => {
        const { x, y, r } = CLUSTER_LAYOUT[i];
        const img = document.createElement("img");
        img.src = p.url;
        img.alt = "";
        img.style.position = "absolute";
        img.style.left = `${CLUSTER_SIZE / 2 + x - THUMB_SIZE / 2}px`;
        img.style.top = `${CLUSTER_SIZE / 2 + y - THUMB_SIZE / 2}px`;
        img.style.width = `${THUMB_SIZE}px`;
        img.style.height = `${THUMB_SIZE}px`;
        img.style.objectFit = "cover";
        img.style.borderRadius = "6px";
        img.style.border = "2px solid white";
        img.style.boxShadow = "0 1px 4px rgba(0,0,0,0.45)";
        img.style.transform = `rotate(${r}deg)`;
        div.appendChild(img);
      });

      div.addEventListener("click", onClick);
      this.div = div;
      this.getPanes()?.overlayMouseTarget.appendChild(div);
    }

    draw() {
      if (!this.div) return;
      const projection = this.getProjection();
      const point = projection?.fromLatLngToDivPixel(new google.maps.LatLng(position));
      if (point) {
        this.div.style.left = `${point.x - CLUSTER_SIZE / 2}px`;
        this.div.style.top = `${point.y - CLUSTER_SIZE / 2}px`;
      }
    }

    onRemove() {
      this.div?.remove();
      this.div = null;
    }
  }

  const overlay = new PhotoClusterOverlay();
  overlay.setMap(map);
  return overlay;
}

export function VisitedCountriesMap({
  initialVisited,
  photosByCountry = {},
  slug,
}: {
  initialVisited: string[];
  photosByCountry?: Record<string, CountryPhoto[]>;
  slug?: string;
}) {
  const { loaded } = useGoogleMaps();
  const mapDivRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const overlaysRef = useRef<google.maps.OverlayView[]>([]);
  const bordersLoadedRef = useRef(false);
  const visitedRef = useRef<Set<string>>(new Set(initialVisited));
  const [visited, setVisited] = useState<Set<string>>(new Set(initialVisited));
  const [query, setQuery] = useState("");
  const [managingCode, setManagingCode] = useState<string | null>(null);

  useEffect(() => {
    visitedRef.current = visited;
  }, [visited]);

  const styleFeature = (feature: google.maps.Data.Feature): google.maps.Data.StyleOptions => {
    const code = String(feature.getProperty("iso_a2") ?? "");
    const isVisited = visitedRef.current.has(code);
    return {
      fillColor: isVisited ? VISITED_FILL : UNVISITED_FILL,
      fillOpacity: isVisited ? 0.65 : 0.25,
      strokeColor: isVisited ? VISITED_STROKE : UNVISITED_STROKE,
      strokeWeight: 1,
      clickable: true,
    };
  };

  useEffect(() => {
    if (!loaded || !mapDivRef.current || mapRef.current) return;
    mapRef.current = new google.maps.Map(mapDivRef.current, {
      center: { lat: 15, lng: 10 },
      zoom: 1,
      streetViewControl: false,
      fullscreenControl: false,
      mapTypeControl: false,
      gestureHandling: "greedy",
    });

    // Real country-shape polygons instead of a pin per visited country —
    // visited ones fill green, everything else stays a neutral gray so the
    // world still reads as a map. Clicking a country's shape toggles it,
    // same as the checklist below.
    mapRef.current.data.loadGeoJson(WORLD_BORDERS_URL, { idPropertyName: "iso_a2" }, () => {
      bordersLoadedRef.current = true;
      mapRef.current?.data.setStyle(styleFeature);
    });
    mapRef.current.data.addListener("click", (e: google.maps.Data.MouseEvent) => {
      const code = String(e.feature.getProperty("iso_a2") ?? "");
      if (code) toggle(code);
    });

    mapRef.current.addListener("zoom_changed", () => drawPhotoClusters());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded]);

  // Re-styles every country feature (green vs. gray) whenever the visited
  // set changes — the Data layer's style function is only evaluated when
  // explicitly (re-)applied, not reactively on every render.
  useEffect(() => {
    if (!loaded || !mapRef.current || !bordersLoadedRef.current) return;
    mapRef.current.data.setStyle(styleFeature);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, visited]);

  function drawPhotoClusters() {
    if (!mapRef.current) return;
    const zoom = mapRef.current.getZoom() ?? 1;
    overlaysRef.current.forEach((o) => o.setMap(null));
    overlaysRef.current = [];
    if (zoom < PHOTO_CLUSTER_ZOOM) return;

    for (const country of WORLD_COUNTRIES) {
      if (!visited.has(country.code)) continue;
      const photos = photosByCountry[country.code] ?? [];
      if (photos.length === 0) continue;
      const position = { lat: country.lat, lng: country.lng };
      overlaysRef.current.push(
        createPhotoClusterOverlay(mapRef.current, position, photos, country.name, () => setManagingCode(country.code))
      );
    }
  }

  // Redraws photo clusters whenever the visited set or photo data changes
  // (country-shape coloring updates itself via the effect above).
  useEffect(() => {
    if (!loaded) return;
    drawPhotoClusters();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, visited, photosByCountry]);

  function toggle(code: string) {
    setVisited((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
    toggleVisitedCountry(code, slug);
  }

  const filtered = query.trim()
    ? WORLD_COUNTRIES.filter((c) => c.name.includes(query.trim()))
    : WORLD_COUNTRIES;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg font-bold">🗺️ המדינות שביקרתי בהן</h2>
        <span className="rounded-full px-3 py-1 text-sm font-bold text-white" style={{ background: "var(--primary)" }}>
          {visited.size}
        </span>
      </div>
      <p className="-mt-2 text-xs opacity-50">התקרבו למדינה כדי לראות תמונות קטנות שהעליתם ממנה במקום דגל בלבד.</p>

      <div
        ref={mapDivRef}
        className="h-[280px] w-full overflow-hidden"
        style={{ borderRadius: "var(--radius)", border: "1px solid var(--primary)" }}
      />

      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="חיפוש מדינה להוספה..."
        className="rounded-lg border px-3 py-2 text-sm"
        style={{ borderColor: "var(--primary)" }}
      />

      <div className="grid max-h-64 grid-cols-2 gap-1.5 overflow-y-auto sm:grid-cols-3 md:grid-cols-4">
        {filtered.map((country) => {
          const isVisited = visited.has(country.code);
          return (
            <div key={country.code} className="flex items-center gap-1">
              <button
                onClick={() => toggle(country.code)}
                className="flex flex-1 items-center gap-1.5 rounded-lg border px-2 py-1.5 text-start text-xs font-medium"
                style={{
                  borderColor: isVisited ? "var(--primary)" : "color-mix(in srgb, var(--primary) 20%, transparent)",
                  background: isVisited ? "color-mix(in srgb, var(--primary) 12%, var(--surface))" : "var(--surface)",
                }}
              >
                <span>{flagEmoji(country.code)}</span>
                <span className="min-w-0 flex-1 truncate">{country.name}</span>
                {isVisited && <span style={{ color: "var(--primary)" }}>✓</span>}
              </button>
              <button
                onClick={() => setManagingCode(country.code)}
                className="shrink-0 rounded-lg border px-1.5 py-1.5 text-xs"
                style={{ borderColor: "color-mix(in srgb, var(--primary) 20%, transparent)" }}
                title="הוספת/ניהול תמונות"
              >
                📷
              </button>
            </div>
          );
        })}
      </div>

      {managingCode && (
        <CountryPhotoManager
          code={managingCode}
          countryName={WORLD_COUNTRIES.find((c) => c.code === managingCode)?.name ?? managingCode}
          photos={photosByCountry[managingCode] ?? []}
          slug={slug}
          onUploaded={() => setVisited((prev) => new Set(prev).add(managingCode))}
          onClose={() => setManagingCode(null)}
        />
      )}
    </div>
  );
}

function CountryPhotoManager({
  code,
  countryName,
  photos,
  slug,
  onUploaded,
  onClose,
}: {
  code: string;
  countryName: string;
  photos: CountryPhoto[];
  slug?: string;
  onUploaded: () => void;
  onClose: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  function handleUpload(formData: FormData) {
    setError(null);
    startTransition(async () => {
      try {
        const result = await uploadCountryPhoto(code, formData, slug);
        if (result?.error) {
          setError(result.error);
          return;
        }
        onUploaded();
        formRef.current?.reset();
      } catch {
        // Should be unreachable now that uploadCountryPhoto itself never
        // throws, but kept as a last line of defense — a raw unhandled
        // rejection here is what could crash the whole page before.
        setError("משהו השתבש בהעלאה - נסו שוב");
      }
    });
  }

  return (
    <div
      className="game-pop-in flex flex-col gap-3 border p-4"
      style={{ borderRadius: "var(--radius)", borderColor: "var(--primary)", background: "var(--surface)" }}
    >
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-bold">{flagEmoji(code)} תמונות מ{countryName}</h3>
        <button onClick={onClose} className="rounded-full px-2 py-1 text-sm opacity-60 hover:opacity-100">
          ✕
        </button>
      </div>

      {photos.length > 0 && (
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
          {photos.map((p) => (
            <div key={p.id} className="group relative aspect-square overflow-hidden rounded-lg">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.url} alt="" className="h-full w-full object-cover" />
              {!p.id.startsWith("album-") && (
                <button
                  onClick={() => deleteCountryPhoto(p.id)}
                  className="absolute end-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100"
                >
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>
      )}
      {photos.length === 0 && <p className="text-xs opacity-50">אין עדיין תמונות למדינה הזו.</p>}

      <form ref={formRef} action={handleUpload} className="flex items-center gap-2">
        <input type="file" name="photos" accept="image/*" multiple className="flex-1 text-xs" />
        <button
          type="submit"
          disabled={pending}
          className="shrink-0 rounded-full px-4 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
          style={{ background: "var(--primary)" }}
        >
          {pending ? "מעלה..." : "העלאה"}
        </button>
      </form>
      {error && <p className="text-xs text-red-600">{error}</p>}
      <p className="text-[11px] opacity-40">אפשר לבחור כמה תמונות יחד. תמונות שהועלו לאלבום של יעד ביבשת/מדינה זו יופיעו כאן אוטומטית.</p>
    </div>
  );
}
