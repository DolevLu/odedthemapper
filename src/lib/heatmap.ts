export type DensityCell = { lat: number; lng: number; count: number };

/** Buckets points into a lat/lng grid and returns one entry per non-empty
 * cell with its point count — a density map built entirely from our own
 * point coordinates, no external data. */
export function buildDensityGrid(points: [number, number][], cellSizeDeg: number): DensityCell[] {
  const cells = new Map<string, DensityCell>();
  for (const [lat, lng] of points) {
    const cellLat = (Math.floor(lat / cellSizeDeg) + 0.5) * cellSizeDeg;
    const cellLng = (Math.floor(lng / cellSizeDeg) + 0.5) * cellSizeDeg;
    const key = `${cellLat}_${cellLng}`;
    const existing = cells.get(key);
    if (existing) existing.count++;
    else cells.set(key, { lat: cellLat, lng: cellLng, count: 1 });
  }
  return Array.from(cells.values());
}

/** 0 = pale yellow, 1 = deep red — a simple two-stop heat gradient. */
export function colorForIntensity(t: number): string {
  const r = 255;
  const g = Math.round(220 - t * 180);
  const b = Math.round(120 - t * 120);
  return `rgb(${r}, ${Math.max(g, 0)}, ${Math.max(b, 0)})`;
}
