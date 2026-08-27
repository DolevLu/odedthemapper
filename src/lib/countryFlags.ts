/** Builds a flag emoji from an ISO 3166-1 alpha-2 code via the standard
 * regional-indicator-symbol technique (each letter A-Z maps to its own
 * Unicode regional indicator, and every real flag emoji is just two of
 * them back to back) — avoids hand-typing/mistyping 30 flag emoji directly. */
function flagFromIso(code: string): string {
  return String.fromCodePoint(...code.toUpperCase().split("").map((c) => 127397 + c.charCodeAt(0)));
}

/** Maps a destination slug to the ISO alpha-2 code used by WORLD_COUNTRIES —
 * lets Album photos uploaded for a destination auto-surface on that
 * country's pin on the visited-countries world map, and is also the source
 * for every flag emoji shown anywhere in the app (see COUNTRY_BY_SLUG). */
export const COUNTRY_CODE_BY_SLUG: Record<string, string> = {
  italy: "IT",
  prague: "CZ",
  japan: "JP",
  copenhagen: "DK",
  budapest: "HU",
  thailand: "TH",
  china: "CN",
  vietnam: "VN",
  poland: "PL",
  usa: "US",
  laos: "LA",
  cambodia: "KH",
  sweden: "SE",
  england: "GB",
  netherlands: "NL",
  tanzania: "TZ",
  norway: "NO",
  singapore: "SG",
  france: "FR",
  cyprus: "CY",
  croatia: "HR",
  romania: "RO",
  austria: "AT",
  philippines: "PH",
  portugal: "PT",
  dubai: "AE",
  greece: "GR",
  spain: "ES",
  korea: "KR",
  argentina: "AR",
  israel: "IL",
};

const COUNTRY_NAME_BY_SLUG: Record<string, string> = {
  italy: "איטליה",
  prague: "צ׳כיה",
  japan: "יפן",
  copenhagen: "דנמרק",
  budapest: "הונגריה",
  thailand: "תאילנד",
  china: "סין",
  vietnam: "ויאטנם",
  poland: "פולין",
  usa: "ארה״ב",
  laos: "לאוס",
  cambodia: "קמבודיה",
  sweden: "שבדיה",
  england: "אנגליה",
  netherlands: "הולנד",
  tanzania: "טנזניה",
  norway: "נורבגיה",
  singapore: "סינגפור",
  france: "צרפת",
  cyprus: "קפריסין",
  croatia: "קרואטיה",
  romania: "רומניה",
  austria: "אוסטריה",
  philippines: "הפיליפינים",
  portugal: "פורטוגל",
  dubai: "איחוד האמירויות",
  greece: "יוון",
  spain: "ספרד",
  korea: "קוריאה",
  argentina: "ארגנטינה",
  israel: "ישראל",
};

export const COUNTRY_BY_SLUG: Record<string, { flag: string; name: string }> = Object.fromEntries(
  Object.entries(COUNTRY_CODE_BY_SLUG).map(([slug, code]) => [slug, { flag: flagFromIso(code), name: COUNTRY_NAME_BY_SLUG[slug] ?? slug }])
);

/** Best-effort flag lookup for a destination slug not covered above (a new
 * destination added after this file) — falls back to a generic globe rather
 * than nothing. */
export function flagForSlug(slug: string): string {
  return COUNTRY_BY_SLUG[slug]?.flag ?? "🌍";
}
