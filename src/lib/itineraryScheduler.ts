import { haversineKm } from "@/lib/geo";
import { optimizeAcrossDays, orderByNearestNeighbor } from "@/lib/routeOptimizer";

const LUNCH_CATEGORY_MATCH = /מסעד|קפה|בראנץ/;
const EVENING_CATEGORY_MATCH = /מסעד|בר|לילה|מועדונ/;
// "Commonly done, worth recommending" tier — cruises/boat tours, museums,
// galleries, viewpoints — ranked below the destination's isMustSee landmarks
// but above generic filler attractions, so a trip fills out with the things
// most travelers actually do (not just the unmissable headliners) before it
// resorts to whatever's simply nearby.
const RECOMMENDED_CATEGORY_MATCH = /מוזיאון|גלריה|שיט|סיור מודרך|תצפית|קרוזה/;
// An airport is a place you pass through, not a stop to visit — but a real
// KML import can still tag it under a generic "attractions" category (seen
// live: "Václav Havel Airport Prague" filed under אטרקציות כללי), so it has
// to be excluded by name, not by trusting the category.
const AIRPORT_NAME_MATCH = /airport|נמל תעופה|שדה תעופה/i;
const ATTRACTIONS_PER_DAY = 5; // 3 morning + 2 afternoon, framing the lunch/dinner slots
export const TOTAL_STOPS_PER_DAY = ATTRACTIONS_PER_DAY + 2; // + lunch + evening food/bar = 7

export type SchedulablePoi = { id: string; name: string; lat: number; lng: number; isMustSee: boolean; hasPhoto: boolean; categoryName: string };
export type ScheduledStop = { poiId: string; order: number; timeOfDay: string };

function byQuality(a: SchedulablePoi, b: SchedulablePoi): number {
  if (a.isMustSee !== b.isMustSee) return Number(b.isMustSee) - Number(a.isMustSee);
  const aRecommended = RECOMMENDED_CATEGORY_MATCH.test(a.categoryName);
  const bRecommended = RECOMMENDED_CATEGORY_MATCH.test(b.categoryName);
  if (aRecommended !== bRecommended) return Number(bRecommended) - Number(aRecommended);
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
 * POIs: airports are dropped (see AIRPORT_NAME_MATCH — a place you pass
 * through, never a stop), must-see landmarks and commonly-recommended spots
 * (museums/cruises/viewpoints — see RECOMMENDED_CATEGORY_MATCH) are
 * prioritized into the attraction pool, then split across days by
 * optimizeAcrossDays' density-respecting tour-then-slice (so a dense core
 * area doesn't lose stops to an artificially padded-out day on the sparse
 * side of town), and a lunch stop (cafe/restaurant) plus an evening stop
 * (restaurant/bar) are woven in near that day's cluster — 7 stops/day: 3
 * morning attractions, lunch, 2 afternoon attractions, evening food. Shared
 * by both AI-generation entry points (the itinerary wizard and the
 * destination-matching quiz) so they produce the same quality of plan.
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
  const schedulable = candidates.filter((p) => !AIRPORT_NAME_MATCH.test(p.name));
  const lunchPool = schedulable.filter((p) => LUNCH_CATEGORY_MATCH.test(p.categoryName)).sort(byQuality);
  const eveningPool = schedulable.filter((p) => EVENING_CATEGORY_MATCH.test(p.categoryName)).sort(byQuality);
  const attractionPool = schedulable
    .filter((p) => !LUNCH_CATEGORY_MATCH.test(p.categoryName) && !EVENING_CATEGORY_MATCH.test(p.categoryName))
    .sort(byQuality)
    .slice(0, tripDays * ATTRACTIONS_PER_DAY);

  const attractionsByDay = optimizeAcrossDays(attractionPool, tripDays, hotelAnchor);
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
