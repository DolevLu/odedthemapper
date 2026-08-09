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

/**
 * Fixed color+icon per category *type*, applied the same way on every
 * destination's map regardless of what color the KML import happened to
 * assign that category — so e.g. bars are always dark blue with a beer
 * icon everywhere, not a different shade per destination.
 */
const STANDARD_CATEGORY_STYLES: { match: RegExp; color: string; icon: { type: "path"; d: string } | { type: "text"; char: string } }[] = [
  { match: /קפה|בראנץ|גלידה|coffee|cafe/i, color: "#F97316", icon: { type: "path", d: pathForCategory("קפה") } },
  { match: /מסעד|אוכל|food|restaurant/i, color: "#F97316", icon: { type: "path", d: pathForCategory("מסעדות") } },
  { match: /פארק|גן|park|garden/i, color: "#16A34A", icon: { type: "path", d: pathForCategory("פארק") } },
  { match: /בר|לילה|pub|drink|מועדונ|club/i, color: "#1E3A5F", icon: { type: "path", d: pathForCategory("בר") } },
  { match: /מטרו|רכבת|תחבורה|תחב"צ|metro|train|station/i, color: "#8B5A2B", icon: { type: "text", char: "M" } },
  { match: /עיר|עיירה|יישוב|town|city/i, color: "#2563EB", icon: { type: "path", d: CHECK_PATH } },
  { match: /אטרקצי|attraction/i, color: "#7C3AED", icon: { type: "path", d: STAR_PATH } },
];

/** Builds a small colored-circle marker icon with the category's glyph
 * baked in (as a data: SVG), so a marker's category is readable at a glance
 * without opening it or memorizing colors. Falls back to the destination's
 * own KML-derived color/icon for categories outside the standardized set. */
export function categoryMarkerIcon(fallbackColor: string, categoryName: string, scale = 15): google.maps.Icon {
  const standard = STANDARD_CATEGORY_STYLES.find((s) => s.match.test(categoryName));
  const color = standard?.color ?? fallbackColor;
  const glyph =
    standard?.icon.type === "text"
      ? `<text x="12" y="17" font-size="15" font-weight="700" font-family="Arial, sans-serif" text-anchor="middle" fill="white">${standard.icon.char}</text>`
      : `<path d="${standard?.icon.type === "path" ? standard.icon.d : pathForCategory(categoryName)}" fill="white" />`;

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${scale * 2}" height="${scale * 2}" viewBox="0 0 ${scale * 2} ${scale * 2}">
      <circle cx="${scale}" cy="${scale}" r="${scale - 1.5}" fill="${color}" stroke="white" stroke-width="2" />
      <g transform="translate(${scale * 0.5}, ${scale * 0.5}) scale(${scale / 24})">
        ${glyph}
      </g>
    </svg>`;
  return {
    url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
    scaledSize: new google.maps.Size(scale * 2, scale * 2),
    anchor: new google.maps.Point(scale, scale),
    // Positions an optional marker.setLabel(...) name tag just above the pin
    // instead of centered on top of it.
    labelOrigin: new google.maps.Point(scale, -8),
  };
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
