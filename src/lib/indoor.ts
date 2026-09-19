// Best-effort heuristic - there's no dedicated "indoor" field on a POI, so
// this matches category names against known indoor/outdoor keywords.
// Outdoor keywords win over indoor ones (e.g. an outdoor "shopping street"
// won't get suggested), and a category matching neither is left out of the
// indoor list entirely rather than guessed - a shorter, reliable list beats
// a longer, noisy one for a "it's raining" suggestion.
export const INDOOR_HINTS = [
  "מוזיאון", "גלריה", "קניון", "מסעד", "קפה", "בר", "ספא", "תיאטרון", "מועדון",
  "אולם", "שוק מקור", "אקווריום", "פלנטריום", "כנסיי", "מסגד", "ארמון", "קולנוע",
  "מרכז קניות", "בריכה מקורה",
];
export const OUTDOOR_HINTS = [
  "פארק", "טבע", "חוף", "טיול רגלי", "שביל", "הרים", "מפל", "יער", "טיילת",
  "נוף", "road trip", "רחוב", "גן ציבורי",
];

export function isIndoorFriendly(categoryName: string): boolean {
  if (OUTDOOR_HINTS.some((h) => categoryName.includes(h))) return false;
  return INDOOR_HINTS.some((h) => categoryName.includes(h));
}

export function isOutdoorStop(categoryName: string | null): boolean {
  if (!categoryName) return false;
  return OUTDOOR_HINTS.some((h) => categoryName.includes(h));
}
