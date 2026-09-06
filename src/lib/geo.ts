// Area names used as a country-wide catch-all bucket (a KML folder for
// general/touring content not tied to one specific city) rather than a real
// named place — "Road Trip", "כללי" (general), "שאר X" (the rest of X),
// "חלוקה לאזורים" (region breakdown), etc. Matters for anything that picks a
// destination's "busiest" area as a stand-in for its main/capital city (map
// default zoom, weather forecast location): a generic bucket that
// aggregates every point NOT assigned to one specific city almost always
// has more POIs than any single real city does, so without filtering these
// out, "busiest area" ended up meaning "scattered across the whole country"
// instead of the capital/main city it was meant to approximate.
const GENERIC_AREA_PATTERN = /^(road[\s-]?trip|רואד\s*טריפ|כללי|חלוקה\s*לאזורים|בונוס|הנחות(\s|$)|שאר\s)/i;

export function isGenericAreaName(name: string): boolean {
  return GENERIC_AREA_PATTERN.test(name.trim());
}

export function haversineKm(a: [number, number], b: [number, number]): number {
  const [lat1, lng1] = a;
  const [lat2, lng2] = b;
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

export const DAY_COLORS = [
  "#E11D48", // rose
  "#2563EB", // blue
  "#059669", // emerald
  "#D97706", // amber
  "#7C3AED", // violet
  "#DB2777", // pink
  "#0891B2", // cyan
  "#65A30D", // lime
];

export function colorForDay(index: number): string {
  return DAY_COLORS[index % DAY_COLORS.length];
}

/** Honest heuristic, not real transit routing: short hops are walkable,
 * medium ones are bus-distance, long ones are more likely a metro/train.
 * Shared between DayRouteMap's own hop markers and DayItemsList's between-
 * stops connector so the two always agree on the same icon for the same
 * pair of points. */
export function transportIconFor(distanceKm: number): string {
  if (distanceKm < 1) return "🚶";
  if (distanceKm < 4) return "🚌";
  return "🚇";
}

/** Color to match transportIconFor's mode — not a real transit line color
 * (we have no live transit data to know the actual bus/metro line), just a
 * consistent per-mode accent so the connector reads at a glance. Metro
 * reuses the exact brown mapStyles.ts already uses for its own metro/train
 * category marker, for one consistent "metro" color across the app. */
export function transportColorFor(distanceKm: number): string {
  if (distanceKm < 1) return "#94A3B8"; // walking — neutral gray
  if (distanceKm < 4) return "#2563EB"; // bus — blue
  return "#8B5A2B"; // metro/train — matches mapStyles' metro category color
}

/** A same-tab-free "how do I get there" link between two points — Google
 * Maps' documented URL scheme (maps.google.com/maps/dir, no API key, no
 * cost) rather than anything routed through our own Directions API calls,
 * which would need a billing-enabled Google Cloud project (see
 * enrichPoi.ts's own "no paid APIs" reasoning for why that's avoided
 * elsewhere in this app too). travelmode is "walking" for a walkable hop,
 * "transit" (real buses/trains, whichever Google's own data says is best)
 * for anything longer — our own bus-vs-metro icon guess isn't reliable
 * enough to force a specific mode Google might reject as unreachable. */
export function googleMapsDirectionsUrl(from: { lat: number; lng: number }, to: { lat: number; lng: number }, distanceKm: number): string {
  const travelmode = distanceKm < 1 ? "walking" : "transit";
  return `https://www.google.com/maps/dir/?api=1&origin=${from.lat},${from.lng}&destination=${to.lat},${to.lng}&travelmode=${travelmode}`;
}
