import { haversineKm } from "@/lib/geo";
import { optimizeAcrossDays, orderByNearestNeighbor } from "@/lib/routeOptimizer";

const LUNCH_CATEGORY_MATCH = /מסעד|קפה|בראנץ/;
const EVENING_CATEGORY_MATCH = /מסעד|בר|לילה|מועדונ/;
const ATTRACTIONS_PER_DAY = 5; // 3 morning + 2 afternoon, framing the lunch/dinner slots
export const TOTAL_STOPS_PER_DAY = ATTRACTIONS_PER_DAY + 2; // + lunch + evening food/bar = 7

export type SchedulablePoi = { id: string; lat: number; lng: number; isMustSee: boolean; hasPhoto: boolean; categoryName: string };
export type ScheduledStop = { poiId: string; order: number; timeOfDay: string };

function byQuality(a: SchedulablePoi, b: SchedulablePoi): number {
  if (a.isMustSee !== b.isMustSee) return Number(b.isMustSee) - Number(a.isMustSee);
  return Number(b.hasPhoto) - Number(a.hasPhoto);
}

function takeNearestUnused(pool: SchedulablePoi[], used: Set<string>, centroid: { lat: number; lng: number }): SchedulablePoi | null {
  let best: SchedulablePoi | null = null;
  let bestDist = Infinity;
  for (const p of pool) {
    if (used.has(p.id)) continue;
    const d = haversineKm([centroid.lat, centroid.lng], [p.lat, p.lng]);
    if (d < bestDist) {
      bestDist = d;
      best = p;
    }
  }
  if (best) used.add(best.id);
  return best;
}

/**
 * Builds a day-by-day, time-scheduled itinerary from a pool of candidate
 * POIs: must-see landmarks are prioritized into the attraction pool (so
 * they're guaranteed a spot and naturally spread across days as more days
 * are added), geographically clustered/ordered per day, and a lunch stop
 * (cafe/restaurant) plus an evening stop (restaurant/bar) are woven in near
 * that day's cluster — 7 stops/day: 3 morning attractions, lunch, 2
 * afternoon attractions, evening food. Shared by both AI-generation entry
 * points (the itinerary wizard and the destination-matching quiz) so they
 * produce the same quality of plan.
 *
 * When a hotel anchor is given (from the traveler's saved logistics), each
 * day's walking order is re-rooted to start from whichever stop is closest
 * to the hotel, so the day's route reads as a sensible loop out from where
 * they're actually staying instead of an arbitrary starting point.
 */
export function scheduleItineraryDays(
  candidates: SchedulablePoi[],
  tripDays: number,
  hotelAnchor?: { lat: number; lng: number } | null
): ScheduledStop[][] {
  const lunchPool = candidates.filter((p) => LUNCH_CATEGORY_MATCH.test(p.categoryName)).sort(byQuality);
  const eveningPool = candidates.filter((p) => EVENING_CATEGORY_MATCH.test(p.categoryName)).sort(byQuality);
  const attractionPool = candidates
    .filter((p) => !LUNCH_CATEGORY_MATCH.test(p.categoryName) && !EVENING_CATEGORY_MATCH.test(p.categoryName))
    .sort(byQuality)
    .slice(0, tripDays * ATTRACTIONS_PER_DAY);

  const attractionsByDay = optimizeAcrossDays(attractionPool, tripDays);
  const usedFoodIds = new Set<string>();
  const days: ScheduledStop[][] = [];

  for (let dayIdx = 0; dayIdx < tripDays; dayIdx++) {
    let dayAttractions = attractionsByDay[dayIdx] ?? [];
    if (hotelAnchor && dayAttractions.length > 1) {
      let nearestIdx = 0;
      let nearestDist = Infinity;
      for (let i = 0; i < dayAttractions.length; i++) {
        const d = haversineKm([hotelAnchor.lat, hotelAnchor.lng], [dayAttractions[i].lat, dayAttractions[i].lng]);
        if (d < nearestDist) {
          nearestDist = d;
          nearestIdx = i;
        }
      }
      const rooted = [dayAttractions[nearestIdx], ...dayAttractions.slice(0, nearestIdx), ...dayAttractions.slice(nearestIdx + 1)];
      dayAttractions = orderByNearestNeighbor(rooted);
    }
    const centroid =
      dayAttractions.length > 0
        ? {
            lat: dayAttractions.reduce((s, p) => s + p.lat, 0) / dayAttractions.length,
            lng: dayAttractions.reduce((s, p) => s + p.lng, 0) / dayAttractions.length,
          }
        : { lat: candidates[0]?.lat ?? 0, lng: candidates[0]?.lng ?? 0 };

    const lunch = takeNearestUnused(lunchPool, usedFoodIds, centroid);
    const evening = takeNearestUnused(eveningPool, usedFoodIds, centroid);

    const morning = dayAttractions.slice(0, 3);
    const afternoon = dayAttractions.slice(3);
    const sequence = [...morning, ...(lunch ? [lunch] : []), ...afternoon, ...(evening ? [evening] : [])];

    let minutes = 9 * 60; // start at 09:00
    const stops: ScheduledStop[] = sequence.map((poi, order) => {
      const timeOfDay = `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
      minutes += 105; // ~1h45 per stop including travel
      return { poiId: poi.id, order, timeOfDay };
    });
    days.push(stops);
  }

  return days;
}
