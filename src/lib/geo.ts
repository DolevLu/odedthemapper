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
