/** Fetches real street geometry for a map viewport from OpenStreetMap's
 * Overpass API — Google Maps JS API has no way to enumerate the road network
 * itself, only to render/geocode against it. Used by the map's shade layer
 * so it covers whatever streets are actually on screen, not just the
 * handful of walking-route lines in our own KML-imported data. */

export type LatLng = { lat: number; lng: number };
export type StreetWay = LatLng[];

const OVERPASS_URL = "https://overpass-api.de/api/interpreter";
const HIGHWAY_TYPES = "primary|secondary|tertiary|residential|unclassified|living_street|pedestrian";
const FETCH_TIMEOUT_MS = 15000;

type OverpassGeometryPoint = { lat: number; lon: number };
type OverpassElement = { type: string; geometry?: OverpassGeometryPoint[] };
type OverpassResponse = { elements?: OverpassElement[] };

export async function fetchStreetsInBounds(bounds: {
  south: number;
  west: number;
  north: number;
  east: number;
}): Promise<StreetWay[]> {
  const query = `[out:json][timeout:20];way["highway"~"^(${HIGHWAY_TYPES})$"](${bounds.south},${bounds.west},${bounds.north},${bounds.east});out geom;`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(OVERPASS_URL, {
      method: "POST",
      body: "data=" + encodeURIComponent(query),
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      signal: controller.signal,
    });
    if (!res.ok) throw new Error("overpass request failed");
    const data = (await res.json()) as OverpassResponse;
    return (data.elements ?? [])
      .filter((el) => el.type === "way" && Array.isArray(el.geometry) && el.geometry.length >= 2)
      .map((el) => el.geometry!.map((g) => ({ lat: g.lat, lng: g.lon })));
  } finally {
    clearTimeout(timeout);
  }
}
