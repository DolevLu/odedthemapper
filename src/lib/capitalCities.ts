/** Per-destination "default view" target — the map should open zoomed into
 * the capital/main city, not an average of every POI in the country (which
 * can drift toward wherever content happens to be denser, or toward a big
 * empty stretch between far-apart cities). Two tiers:
 *
 * 1. CAPITAL_AREA_MATCH: most destinations already have a real KML area
 *    folder for their capital ("פראג", "Beijing", "אמסטרדם", ...) — matching
 *    against that reuses real curated coordinates instead of a hardcoded
 *    guess, and stays correct if that area's own content shifts later.
 * 2. CAPITAL_COORDS: destinations with no distinctly-named capital area
 *    (single-blob countries, or a country split only into "כללי"/"Road
 *    Trip") fall back to a plain hardcoded lat/lng for the capital.
 *
 * A destination in neither table (or one whose area-name match doesn't
 * actually appear in that destination's imported content) falls back to the
 * caller's own busiest-area heuristic — see MapScreen.tsx.
 */
export const CAPITAL_AREA_MATCH_BY_SLUG: Record<string, RegExp> = {
  austria: /וינה/,
  budapest: /בודפשט/,
  cambodia: /פנום פן/,
  china: /^Beijing$/,
  france: /פריז/,
  greece: /אתונה/,
  hongkong: /Hong ?[Kk]ong/,
  italy: /רומא/,
  japan: /^Tokyo$/,
  korea: /סיאול/,
  lithuania: /וילנה/,
  netherlands: /אמסטרדם/,
  norway: /אוסלו/,
  philippines: /מנילה/,
  poland: /ורשה/,
  portugal: /ליסבון/,
  prague: /פראג/,
  romania: /בוקרשט/,
  spain: /מדריד/,
  sweden: /סטוקהולם/,
  // Not the political capital (Dodoma) — Zanzibar is the city this
  // destination is actually named/sold around (see its own tagline).
  tanzania: /זנזיבר/,
  thailand: /בנגקוק/,
  vietnam: /האנוי/,
};

export const CAPITAL_COORDS_BY_SLUG: Record<string, { lat: number; lng: number }> = {
  argentina: { lat: -34.6037, lng: -58.3816 }, // Buenos Aires
  copenhagen: { lat: 55.6761, lng: 12.5683 },
  croatia: { lat: 45.815, lng: 15.9819 }, // Zagreb
  cyprus: { lat: 35.1856, lng: 33.3823 }, // Nicosia
  denmark: { lat: 55.6761, lng: 12.5683 }, // Copenhagen
  dubai: { lat: 25.2048, lng: 55.2708 },
  england: { lat: 51.5074, lng: -0.1278 }, // London
  estonia: { lat: 59.437, lng: 24.7536 }, // Tallinn
  israel: { lat: 31.7683, lng: 35.2137 }, // Jerusalem
  laos: { lat: 17.9757, lng: 102.6331 }, // Vientiane
  latvia: { lat: 56.9496, lng: 24.1052 }, // Riga
  malta: { lat: 35.8989, lng: 14.5146 }, // Valletta
  singapore: { lat: 1.3521, lng: 103.8198 },
  // Not the political capital (Bern) — Zurich is the main gateway city.
  switzerland: { lat: 47.3769, lng: 8.5417 },
};
