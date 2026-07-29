import { haversineKm } from "./geo";

export type OptimizablePoint = { id: string; lat: number; lng: number };

/**
 * Distance/geography-based itinerary optimization — NOT real transit
 * routing. We don't have a reliable source for per-city bus/metro line data,
 * so "optimize" means: (1) regroup points into day-clusters that minimize
 * geographic spread, (2) order each day's points to minimize total walking
 * distance (nearest-neighbor). This is honest algorithmic optimization, not
 * a substitute for real public-transit directions.
 */
export function optimizeAcrossDays<T extends OptimizablePoint>(points: T[], numDays: number): T[][] {
  if (points.length === 0) return Array.from({ length: numDays }, () => []);
  if (numDays <= 1) return [orderByNearestNeighbor(points)];

  const clusters = kMeansClusters(points, numDays);
  return clusters.map((cluster) => orderByNearestNeighbor(cluster));
}

/** Re-orders a single day's points by nearest neighbor, without reshuffling across days. */
export function orderByNearestNeighbor<T extends OptimizablePoint>(points: T[]): T[] {
  if (points.length <= 2) return [...points];
  const remaining = [...points];
  const ordered: T[] = [remaining.shift()!];

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

/** Simple k-means over lat/lng to split points into `k` geographic day-groups. */
function kMeansClusters<T extends OptimizablePoint>(points: T[], k: number): T[][] {
  const n = points.length;
  const actualK = Math.min(k, n);

  // Seed centroids by spreading across the sorted-by-lat list (deterministic, no randomness).
  const sorted = [...points].sort((a, b) => a.lat - b.lat);
  let centroids = Array.from({ length: actualK }, (_, i) => {
    const p = sorted[Math.floor((i * n) / actualK)];
    return { lat: p.lat, lng: p.lng };
  });

  const assignments = new Array(n).fill(0);

  for (let iter = 0; iter < 8; iter++) {
    let changed = false;
    for (let i = 0; i < n; i++) {
      let best = 0;
      let bestDist = Infinity;
      for (let c = 0; c < actualK; c++) {
        const d = haversineKm([points[i].lat, points[i].lng], [centroids[c].lat, centroids[c].lng]);
        if (d < bestDist) {
          bestDist = d;
          best = c;
        }
      }
      if (assignments[i] !== best) changed = true;
      assignments[i] = best;
    }

    const sums = Array.from({ length: actualK }, () => ({ lat: 0, lng: 0, count: 0 }));
    for (let i = 0; i < n; i++) {
      const c = assignments[i];
      sums[c].lat += points[i].lat;
      sums[c].lng += points[i].lng;
      sums[c].count += 1;
    }
    centroids = sums.map((s, i) => (s.count > 0 ? { lat: s.lat / s.count, lng: s.lng / s.count } : centroids[i]));

    if (!changed) break;
  }

  const groups: T[][] = Array.from({ length: k }, () => []);
  points.forEach((p, i) => groups[assignments[i] % k].push(p));

  // Balance: move points from oversized clusters into any empty/undersized ones
  // so every requested day gets at least a chance at content when points allow it.
  const target = Math.ceil(n / k);
  for (let c = 0; c < k; c++) {
    while (groups[c].length > target) {
      const donor = groups[c].pop()!;
      const receiver = groups.reduce((minIdx, g, idx) => (g.length < groups[minIdx].length ? idx : minIdx), 0);
      if (receiver === c) break;
      groups[receiver].push(donor);
    }
  }

  return groups;
}
