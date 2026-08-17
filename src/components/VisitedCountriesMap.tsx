"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useGoogleMaps } from "@/hooks/useGoogleMaps";
import { toggleVisitedCountry, uploadCountryPhoto, deleteCountryPhoto, type CountryPhoto } from "@/lib/actions/visitedCountries";
import { WORLD_COUNTRIES, flagEmoji } from "@/lib/worldCountries";

// Below this zoom the pins are too small/numerous on screen for photo
// thumbnails to read as anything but noise — flags stay flags until you've
// zoomed in on roughly a single country/region.
const PHOTO_CLUSTER_ZOOM = 3;

const CLUSTER_LAYOUT = [
  { x: 0, y: 0, r: 4 },
  { x: 20, y: -6, r: -8 },
  { x: -18, y: 10, r: 10 },
  { x: 14, y: 16, r: -5 },
];

/** Builds a small "photo pile" marker icon — up to 4 scrapbook-style tilted
 * thumbnails clipped to rounded squares. Embeds the actual photo URLs as
 * <image> hrefs inside an SVG data URI; the browser paints the marker <img>
 * itself so the referenced photos just load and render, no canvas/blob work
 * needed (and no cross-origin pixel access happens, so CORS isn't a concern
 * here — it's a plain image paint, not a read-back). */
function photoClusterIcon(photos: CountryPhoto[]): google.maps.Icon {
  const size = 76;
  const c = size / 2;
  const thumbs = photos.slice(0, 4);
  const images = thumbs
    .map((p, i) => {
      const { x, y, r } = CLUSTER_LAYOUT[i];
      const s = 30;
      return `<g transform="translate(${c + x - s / 2} ${c + y - s / 2}) rotate(${r} ${s / 2} ${s / 2})">
        <clipPath id="clip${i}"><rect width="${s}" height="${s}" rx="6" /></clipPath>
        <rect width="${s}" height="${s}" rx="6" fill="white" />
        <image href="${p.url}" width="${s}" height="${s}" clip-path="url(#clip${i})" preserveAspectRatio="xMidYMid slice" />
        <rect width="${s}" height="${s}" rx="6" fill="none" stroke="white" stroke-width="2" />
      </g>`;
    })
    .join("");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">${images}</svg>`;
  return {
    url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
    scaledSize: new google.maps.Size(size, size),
    anchor: new google.maps.Point(c, c),
  };
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
  const markersRef = useRef<google.maps.Marker[]>([]);
  const [visited, setVisited] = useState<Set<string>>(new Set(initialVisited));
  const [query, setQuery] = useState("");
  const [managingCode, setManagingCode] = useState<string | null>(null);

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
    mapRef.current.addListener("zoom_changed", () => drawMarkers());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded]);

  function drawMarkers() {
    if (!mapRef.current) return;
    const zoom = mapRef.current.getZoom() ?? 1;
    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];

    for (const country of WORLD_COUNTRIES) {
      if (!visited.has(country.code)) continue;
      const photos = photosByCountry[country.code] ?? [];
      const useCluster = zoom >= PHOTO_CLUSTER_ZOOM && photos.length > 0;
      const marker = new google.maps.Marker({
        position: { lat: country.lat, lng: country.lng },
        map: mapRef.current,
        title: country.name,
        ...(useCluster ? { icon: photoClusterIcon(photos) } : { label: { text: flagEmoji(country.code), fontSize: "16px" } }),
      });
      marker.addListener("click", () => setManagingCode(country.code));
      markersRef.current.push(marker);
    }
  }

  // Redraw pins whenever the visited set or photo data changes.
  useEffect(() => {
    if (!loaded) return;
    drawMarkers();
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
              {isVisited && (
                <button
                  onClick={() => setManagingCode(country.code)}
                  className="shrink-0 rounded-lg border px-1.5 py-1.5 text-xs"
                  style={{ borderColor: "color-mix(in srgb, var(--primary) 20%, transparent)" }}
                  title="הוספת/ניהול תמונות"
                >
                  📷
                </button>
              )}
            </div>
          );
        })}
      </div>

      {managingCode && (
        <CountryPhotoManager
          code={managingCode}
          countryName={WORLD_COUNTRIES.find((c) => c.code === managingCode)?.name ?? managingCode}
          photos={photosByCountry[managingCode] ?? []}
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
  onClose,
}: {
  code: string;
  countryName: string;
  photos: CountryPhoto[];
  onClose: () => void;
}) {
  const [pending, startTransition] = useTransition();

  function handleUpload(formData: FormData) {
    startTransition(async () => {
      await uploadCountryPhoto(code, formData);
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

      <form action={handleUpload} className="flex items-center gap-2">
        <input type="file" name="photo" accept="image/*" className="flex-1 text-xs" />
        <button
          type="submit"
          disabled={pending}
          className="shrink-0 rounded-full px-4 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
          style={{ background: "var(--primary)" }}
        >
          {pending ? "מעלה..." : "העלאה"}
        </button>
      </form>
      <p className="text-[11px] opacity-40">תמונות שהועלו לאלבום של יעד ביבשת/מדינה זו יופיעו כאן אוטומטית.</p>
    </div>
  );
}
