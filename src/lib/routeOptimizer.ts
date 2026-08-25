import { haversineKm } from "./geo";

export type OptimizablePoint = { id: string; lat: number; lng: number };

/**
 * Distance/geography-based itinerary optimization — NOT real transit
 * routing. We don't have a reliable source for per-city bus/metro line data,
 * so "optimize" means: trace one continuous nearest-neighbor tour through
 * every point, then cut that tour into `numDays` contiguous, roughly
 * equal-COUNT chunks in visiting order.
 *
 * This replaced an earlier k-means-based version that clustered by pure
 * geographic spread and then force-balanced cluster sizes to be roughly
 * equal — which, for a city where the great majority of good stops sit in
 * one dense core (e.g. Prague's Old Town side) with only a handful across
 * the river, kept padding out a whole extra day on the sparse side just to
 * hit the balance target, instead of letting the sparse side be the small
 * detour it actually deserves. Tour-then-slice has no such balancing step:
 * a dense region naturally fills more of the ordered sequence and thus more
 * of the day-chunks, while an outlying handful of points only ever forms
 * its own day if there's genuinely a day's worth of them out there.
 */
export function optimizeAcrossDays<T extends OptimizablePoint>(
  points: T[],
  numDays: number,
  seed?: { lat: number; lng: number } | null
): T[][] {
  if (points.length === 0) return Array.from({ length: numDays }, () => []);
  if (numDays <= 1) return [orderByNearestNeighbor(points, seed)];

  const tour = orderByNearestNeighbor(points, seed);
  const perDay = Math.ceil(tour.length / numDays);
  const days: T[][] = [];
  for (let i = 0; i < numDays; i++) {
    days.push(tour.slice(i * perDay, (i + 1) * perDay));
  }
  return days;
}

/** Re-orders a set of points by nearest neighbor. An optional `seed`
 * (e.g. the traveler's hotel) picks the starting point as whichever of
 * `points` is closest to it, instead of always the list's first element —
 * without one, ordering starts from `points[0]` as before. */
export function orderByNearestNeighbor<T extends OptimizablePoint>(points: T[], seed?: { lat: number; lng: number } | null): T[] {
  if (points.length <= 2) return [...points];
  const remaining = [...points];

  let startIdx = 0;
  if (seed) {
    let bestDist = Infinity;
    remaining.forEach((p, i) => {
      const d = haversineKm([seed.lat, seed.lng], [p.lat, p.lng]);
      if (d < bestDist) {
        bestDist = d;
        startIdx = i;
      }
    });
  }
  const ordered: T[] = [remaining.splice(startIdx, 1)[0]];

  while (remaining.length > 0) {
    const last = ordered[ordered.length - 1];
    let nearestIdx = 0;
    let nearestDist = Infinity;
    for (let i = 0; i < remaining.length; i++) {
      const d = haversineKm([last.lat, last.lng], [remaining[i].lat, remaining[i].lng]);
      if (d < nearestDist) {
        nearestDist = d;
        nearestIdx = i;
      }
    }
    ordered.push(remaining.splice(nearestIdx, 1)[0]);
  }
  return ordered;
}
