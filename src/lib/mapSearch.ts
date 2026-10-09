/** Helpers for the map's search box: instant matches from the curated points, and deciding whether what was typed
 * is ONE specific place ("Café Savoy") or a kind of place ("train station", "תחנת רכבת") - the first gets a single
 * result on the map, the second gets several relevant points marked. */

export function norm(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

// Words that describe a KIND of place rather than name one. A query made only of these is a category search.
const CATEGORY_WORDS = new Set(
  (
    "restaurant restaurants cafe cafes coffee bar bars pub pubs hotel hotels hostel hostels museum museums park parks " +
    "station stations train metro subway bus tram stop atm bank pharmacy supermarket market shop store mall toilet " +
    "toilets wc parking gas beach church synagogue gallery viewpoint club clubs pizza sushi brunch bakery kosher vegan " +
    "nearby near food drink drinks breakfast lunch dinner garden gardens castle attraction attractions " +
    "מסעדה מסעדות קפה בית בתי בר ברים פאב מלון מלונות הוסטל מוזיאון מוזיאונים פארק פארקים גן גנים תחנה תחנת רכבת " +
    "מטרו אוטובוס חשמלית כספומט בנק מרקחת סופר שוק חנות קניון שירותים חניה דלק חוף כנסייה כנסת גלריה תצפית מועדון " +
    "פיצה סושי בראנץ מאפייה כשר טבעוני ליד קרוב אוכל שתייה ארוחת בוקר צהריים ערב טירה אטרקציה אטרקציות"
  ).split(" ")
);

/** True when the query names a single place; false when it asks for a kind of place. `names` are the search
 * results' names, best first. */
export function isSpecificPlaceQuery(query: string, names: string[]): boolean {
  const q = norm(query);
  if (!q || names.length === 0) return false;
  if (names.length === 1) return true;
  const tokens = q.split(" ");
  if (tokens.every((w) => CATEGORY_WORDS.has(w))) return false;
  const top = norm(names[0]);
  // The query is (part of) the top result's own name -> the person typed that place.
  return top.includes(q) || q.includes(top);
}

export type CuratedMatch<T> = { poi: T; score: number };

/** Instant matches among the curated points: name starts with / contains the typed text, nearest first. */
export function matchCurated<T extends { name: string; lat: number; lng: number }>(
  query: string,
  pois: T[],
  center: { lat: number; lng: number } | null,
  limit = 4
): T[] {
  const q = norm(query);
  if (q.length < 2) return [];
  const scored: { poi: T; rank: number; d: number }[] = [];
  for (const poi of pois) {
    const n = norm(poi.name);
    const idx = n.indexOf(q);
    if (idx < 0) continue;
    const rank = idx === 0 ? 0 : n.includes(" " + q) ? 1 : 2;
    const d = center ? (poi.lat - center.lat) ** 2 + (poi.lng - center.lng) ** 2 : 0;
    scored.push({ poi, rank, d });
  }
  scored.sort((a, b) => a.rank - b.rank || a.d - b.d);
  return scored.slice(0, limit).map((s) => s.poi);
}
