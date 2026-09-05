import { pathForCategory } from "@/components/CategoryIcon";

/** Hides Google's default POI/business icons, transit stops, and street
 * labels so our own markers read clearly — keeps only city/region/country
 * names for orientation, per the "don't compete with my own pins" request. */
export const DECLUTTERED_MAP_STYLES: google.maps.MapTypeStyle[] = [
  { featureType: "poi", stylers: [{ visibility: "off" }] },
  { featureType: "transit", stylers: [{ visibility: "off" }] },
  { featureType: "road", elementType: "labels.icon", stylers: [{ visibility: "off" }] },
  { featureType: "road", elementType: "labels.text", stylers: [{ visibility: "off" }] },
  { featureType: "water", elementType: "labels", stylers: [{ visibility: "off" }] },
  { featureType: "administrative.locality", elementType: "labels", stylers: [{ visibility: "on" }] },
  { featureType: "administrative.province", elementType: "labels", stylers: [{ visibility: "on" }] },
  { featureType: "administrative.country", elementType: "labels", stylers: [{ visibility: "on" }] },
];

const STAR_PATH = "M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z";
const CHECK_PATH = "M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z";

/** Shared with the map's kosher-only filter checkbox (rendered inside the
 * restaurants filter pill specifically) — exported so that check and this
 * style rule can't drift apart. */
export const RESTAURANT_CATEGORY_MATCH = /מסעד|אוכל|food|restaurant/i;

// Fixed right-to-left reading order for the map's category filter pills
// (after the always-first "הכל"), rather than each destination showing its
// categories in whatever order the KML happened to list them. `test` is
// checked in the order written here (so e.g. Christmas markets is tested
// before the general shopping pattern, since "שווקי כריסמס" would otherwise
// match "שוק"/market first) — independent of `rank`, which is each
// category's actual position in the final sorted list. A name matching none
// of these sorts after everything that does, alphabetically among itself.
const CATEGORY_ORDER_PRIORITY: { test: RegExp; rank: number }[] = [
  { test: /אטרקציות\s*כללי/, rank: 0 },
  { test: /קפה|בראנץ|גלידה|coffee|cafe/i, rank: 1 },
  { test: RESTAURANT_CATEGORY_MATCH, rank: 2 },
  { test: /בר|pub|drink/i, rank: 3 },
  { test: /כריסמס|חג/i, rank: 8 },
  { test: /שופינג|קניות|שוק|shop|market/i, rank: 4 },
  { test: /מוזיאון|museum/i, rank: 5 },
  { test: /פארק|גן|park|garden/i, rank: 6 },
  { test: /מועדונ|מסיב|club|party/i, rank: 7 },
  { test: /מטרו|רכבת|תחבורה|metro|train|station/i, rank: 9 },
  { test: /אטרקצי|attraction/i, rank: 10 },
  { test: /עיר|עיירה|town|city/i, rank: 11 },
];

export function sortCategoryNames(names: string[]): string[] {
  const rankOf = (name: string) => CATEGORY_ORDER_PRIORITY.find((p) => p.test.test(name))?.rank ?? 999;
  return [...names].sort((a, b) => {
    const diff = rankOf(a) - rankOf(b);
    return diff !== 0 ? diff : a.localeCompare(b, "he");
  });
}

/**
 * Fixed color+icon per category *type*, applied the same way on every
 * destination's map regardless of what color the KML import happened to
 * assign that category — so e.g. bars are always dark blue with a beer
 * icon everywhere, not a different shade per destination.
 */
const STANDARD_CATEGORY_STYLES: { match: RegExp; color: string; icon: { type: "path"; d: string } | { type: "text"; char: string } }[] = [
  { match: /קפה|בראנץ|גלידה|coffee|cafe/i, color: "#F97316", icon: { type: "path", d: pathForCategory("קפה") } },
  { match: RESTAURANT_CATEGORY_MATCH, color: "#F97316", icon: { type: "path", d: pathForCategory("מסעדות") } },
  { match: /פארק|גן|park|garden/i, color: "#16A34A", icon: { type: "path", d: pathForCategory("פארק") } },
  { match: /בר|לילה|pub|drink|מועדונ|club/i, color: "#1E3A5F", icon: { type: "path", d: pathForCategory("בר") } },
  { match: /מטרו|רכבת|תחבורה|תחב"צ|metro|train|station/i, color: "#8B5A2B", icon: { type: "text", char: "M" } },
  { match: /עיר|עיירה|יישוב|town|city/i, color: "#2563EB", icon: { type: "path", d: CHECK_PATH } },
  { match: /אטרקצי|attraction/i, color: "#7C3AED", icon: { type: "path", d: STAR_PATH } },
];

/** The same standardized color categoryMarkerIcon draws map pins with, for
 * UI that shows a category's color WITHOUT drawing a full marker icon (e.g.
 * the map's filter pills) — kept as its own export so the two can't drift
 * apart the way they did before this existed (pins already went through
 * STANDARD_CATEGORY_STYLES and were correctly purple for attractions; filter
 * pills used the raw per-destination KML color instead and showed whatever
 * shade that KML's folder happened to have). */
export function standardCategoryColor(categoryName: string, fallbackColor: string): string {
  return STANDARD_CATEGORY_STYLES.find((s) => s.match.test(categoryName))?.color ?? fallbackColor;
}

// Offered to users saving a personal pin (see SavePinModal) — each label is
// written to match one of STANDARD_CATEGORY_STYLES's regexes above, so
// picking one guarantees the exact same icon+color as every KML-curated
// point in that category, never a mismatched/invented look. "אחר" is the
// deliberate catch-all: it matches none of them, so it renders with
// SAVED_PIN_FALLBACK_COLOR and the generic default pin glyph.
export const SAVED_PIN_CATEGORY_OPTIONS = [
  "בתי קפה",
  "מסעדות",
  "פארקים",
  "ברים",
  "תחנות מטרו ורכבת",
  "ערים ועיירות",
  "אטרקציות",
  "אחר",
];
export const SAVED_PIN_FALLBACK_COLOR = "#6B7280";

// Index-aligned with STANDARD_CATEGORY_STYLES — the SAVED_PIN_CATEGORY_OPTIONS
// label that corresponds to each standard bucket.
const CATEGORY_OPTION_BY_BUCKET = ["בתי קפה", "מסעדות", "פארקים", "ברים", "תחנות מטרו ורכבת", "ערים ועיירות", "אטרקציות"];

/** Which STANDARD_CATEGORY_STYLES bucket (if any) a free-text category name
 * falls into, by index. Used both to file an uploaded personal map point
 * under one of SAVED_PIN_CATEGORY_OPTIONS's fixed labels (categoryOptionForName)
 * and to let the map's category filter show personal points under a
 * destination category of the same real-world type — their exact names
 * rarely match (a KML's own "קפה" vs. the fixed pin option "בתי קפה"), but
 * both match the same regex bucket. */
export function standardCategoryBucket(name: string): number | null {
  const idx = STANDARD_CATEGORY_STYLES.findIndex((s) => s.match.test(name));
  return idx === -1 ? null : idx;
}

/** Best-effort match of a free-text category/folder name (from an uploaded
 * personal KML/KMZ) to one of the fixed SAVED_PIN_CATEGORY_OPTIONS labels,
 * so an uploaded point renders with a real, recognizable icon+color instead
 * of always falling back to the generic pin. Falls back to "אחר" (the same
 * catch-all a user picks manually when saving a place from the map). */
export function categoryOptionForName(name: string): string {
  const idx = standardCategoryBucket(name);
  return idx === null ? "אחר" : CATEGORY_OPTION_BY_BUCKET[idx];
}

// A destination has only a handful of distinct (color, category, scale,
// favorited, override) combinations, but every marker was rebuilding its own
// icon from scratch on every zoom-tier change (see markerScaleForZoom in
// MapScreen) — a full SVG string build + encodeURIComponent + fresh
// google.maps.Icon/Size/Point allocation, run synchronously for every one of
// up to 1000+ markers the instant a zoom gesture crossed that threshold.
// That's exactly what read as "the map hangs for a moment when I zoom."
// Caching by the same inputs collapses that down to a handful of real builds
// (one per distinct combination) plus cheap Map lookups for every repeat —
// sharing the same Icon object across markers is safe since Marker only
// reads it, never mutates it.
const iconCache = new Map<string, google.maps.Icon>();

/** Builds a small colored-circle marker icon with the category's glyph
 * baked in (as a data: SVG), so a marker's category is readable at a glance
 * without opening it or memorizing colors. Falls back to the destination's
 * own KML-derived color/icon for categories outside the standardized set. */
export function categoryMarkerIcon(
  fallbackColor: string,
  categoryName: string,
  scale = 15,
  favorited = false,
  // An admin's explicit per-POI color choice (PointOfInterest.colorHex) —
  // always wins over the standard category color when set, since otherwise
  // a category match (café/restaurant/bar/etc.) always overrode any custom
  // color and the "real color picker" admin feature would have no visible
  // effect for the majority of POIs, which do match one of those.
  overrideColor?: string | null
): google.maps.Icon {
  const cacheKey = `${fallbackColor}|${categoryName}|${scale}|${favorited}|${overrideColor ?? ""}`;
  const cached = iconCache.get(cacheKey);
  if (cached) return cached;

  const standard = STANDARD_CATEGORY_STYLES.find((s) => s.match.test(categoryName));
  const color = overrideColor || standard?.color || fallbackColor;
  // Favorited points get a bright yellow glyph instead of white so they
  // stand out ("shine") at a glance while scanning the map, without needing
  // to open each one to check.
  const glyphFill = favorited ? "#FDE047" : "white";
  const glyph =
    standard?.icon.type === "text"
      ? `<text x="12" y="17" font-size="15" font-weight="700" font-family="Arial, sans-serif" text-anchor="middle" fill="${glyphFill}">${standard.icon.char}</text>`
      : `<path d="${standard?.icon.type === "path" ? standard.icon.d : pathForCategory(categoryName)}" fill="${glyphFill}" />`;

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${scale * 2}" height="${scale * 2}" viewBox="0 0 ${scale * 2} ${scale * 2}">
      <circle cx="${scale}" cy="${scale}" r="${scale - 1.5}" fill="${color}" stroke="white" stroke-width="2" />
      <g transform="translate(${scale * 0.5}, ${scale * 0.5}) scale(${scale / 24})">
        ${glyph}
      </g>
    </svg>`;
  const icon: google.maps.Icon = {
    url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
    scaledSize: new google.maps.Size(scale * 2, scale * 2),
    anchor: new google.maps.Point(scale, scale),
    // Positions an optional marker.setLabel(...) name tag just above the pin
    // instead of centered on top of it.
    labelOrigin: new google.maps.Point(scale, -8),
  };
  iconCache.set(cacheKey, icon);
  return icon;
}

/** A pulsing "you are here" pinpoint, styled like Google Maps' own blue dot. */
export function currentLocationIcon(): google.maps.Icon {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="44" height="44" viewBox="0 0 44 44">
      <circle cx="22" cy="22" r="16" fill="#4285F4" fill-opacity="0.2" />
      <circle cx="22" cy="22" r="8" fill="#4285F4" stroke="white" stroke-width="3" />
    </svg>`;
  return {
    url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
    scaledSize: new google.maps.Size(44, 44),
    anchor: new google.maps.Point(22, 22),
  };
}
