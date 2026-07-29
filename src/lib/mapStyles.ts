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

/** Builds a small colored-circle marker icon with the category's glyph
 * baked in (as a data: SVG), so a marker's category is readable at a glance
 * without opening it or memorizing colors. */
export function categoryMarkerIcon(color: string, categoryName: string, scale = 15): google.maps.Icon {
  const path = pathForCategory(categoryName);
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${scale * 2}" height="${scale * 2}" viewBox="0 0 ${scale * 2} ${scale * 2}">
      <circle cx="${scale}" cy="${scale}" r="${scale - 1.5}" fill="${color}" stroke="white" stroke-width="2" />
      <g transform="translate(${scale * 0.5}, ${scale * 0.5}) scale(${scale / 24})">
        <path d="${path}" fill="white" />
      </g>
    </svg>`;
  return {
    url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
    scaledSize: new google.maps.Size(scale * 2, scale * 2),
    anchor: new google.maps.Point(scale, scale),
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
