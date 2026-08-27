import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";

export type FlatPoi = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  geometryType: string;
  /** [lng, lat] pairs for line/polygon geometries; null for points. */
  geometryCoords: [number, number][] | null;
  areaName: string;
  categoryName: string;
  categoryColor: string;
  /** The placemark's own KML-resolved color, when it has one — distinct from
   * categoryColor (one shared swatch per category/folder). Matters for line/
   * polygon geometries (e.g. several differently colored metro lines grouped
   * under one category), where each needs its real individual color. */
  colorHex: string | null;
  /** Admin override of which category's icon glyph to draw — see
   * PointOfInterest.iconCategory. Independent of the POI's real category. */
  iconCategory: string | null;
  address: string | null;
  priceRange: string | null;
  bookingUrl: string | null;
  tip: string | null;
  hours: string | null;
  tags: string[];
  photoUrl: string | null;
  description: string | null;
  wantsBooking: boolean;
  isMustSee: boolean;
};

/** Strips <img> tags and remaining HTML markup from a KML description blob,
 * leaving just the human-readable text (the photo is shown separately).
 * Capped to maxLength — every POI's description round-trips through this on
 * every Now/Map screen load (hundreds to thousands of POIs per destination),
 * and nothing in the UI shows more than a couple hundred characters of this
 * generic KML-derived text anyway, so shipping the untruncated blob to the
 * client for every single POI was pure wasted payload. */
export function extractTextDescription(html: string | null, maxLength = 280): string | null {
  if (!html) return null;
  const withoutImages = html.replace(/<img[^>]*>/gi, "");
  const text = withoutImages
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!text) return null;
  return text.length > maxLength ? `${text.slice(0, maxLength).trim()}…` : text;
}

/** This is the single heaviest, most-repeated query in the whole app — up to
 * ~2000+ POIs (with tags + a photo each) for large destinations, and it's
 * called fresh by Map, Now, Itinerary, Logistics, and Client-planner on
 * every single navigation between those screens, even though the content
 * only ever changes via an admin KML upload. Wrapped in Next's Data Cache
 * (unstable_cache), tagged per destination so `revalidateTag` in the admin
 * content actions (uploadKml/deleteDestinationContent) invalidates it
 * immediately on a real change, with a 1h time-based revalidate as a safety
 * net for any edit path that doesn't go through those actions. This is the
 * main fix behind "switching between screens feels slow." */
export async function getFlatPoisForDestination(destinationId: string): Promise<FlatPoi[]> {
  return unstable_cache(() => fetchFlatPoisForDestination(destinationId), [`flat-pois-${destinationId}`], {
    tags: [`pois-${destinationId}`],
    revalidate: 3600,
  })();
}

export type PoiOption = { id: string; name: string; areaName: string; categoryName: string };

/** Slim projection of the same data as getFlatPoisForDestination — just
 * enough for a "pick a POI" dropdown (Itinerary's AddClientItem, Client-
 * planner). Those screens never needed the photo/description/tags/booking
 * fields the full flat POI carries, so they were paying to have thousands of
 * those shipped over the wire on every navigation for nothing. Separately
 * cached (own unstable_cache key, same invalidation tag) rather than
 * deriving from getFlatPoisForDestination's result, so a screen that only
 * needs this slice never even materializes the heavier one server-side. */
export async function getPoiOptionsForDestination(destinationId: string): Promise<PoiOption[]> {
  return unstable_cache(() => fetchPoiOptionsForDestination(destinationId), [`poi-options-${destinationId}`], {
    tags: [`pois-${destinationId}`],
    revalidate: 3600,
  })();
}

async function fetchPoiOptionsForDestination(destinationId: string): Promise<PoiOption[]> {
  const areas = await prisma.area.findMany({
    where: { destinationId },
    select: {
      name: true,
      categories: { select: { name: true, pois: { select: { id: true, name: true } } } },
    },
  });
  const flat: PoiOption[] = [];
  for (const area of areas) {
    for (const category of area.categories) {
      for (const poi of category.pois) {
        flat.push({ id: poi.id, name: poi.name, areaName: area.name, categoryName: category.name });
      }
    }
  }
  return flat;
}

/** Slim [lat, lng] pairs for every POI in a destination — all a "where
 * should I stay" density heatmap (Logistics) needs. Matches
 * getFlatPoisForDestination's own behavior of including every geometry type
 * (not just points) unfiltered, so the heatmap's shape doesn't change. */
export async function getPoiLocationsForDestination(destinationId: string): Promise<[number, number][]> {
  return unstable_cache(() => fetchPoiLocationsForDestination(destinationId), [`poi-locations-${destinationId}`], {
    tags: [`pois-${destinationId}`],
    revalidate: 3600,
  })();
}

async function fetchPoiLocationsForDestination(destinationId: string): Promise<[number, number][]> {
  const pois = await prisma.pointOfInterest.findMany({
    where: { category: { area: { destinationId } } },
    select: { lat: true, lng: true },
  });
  return pois.map((p) => [p.lat, p.lng]);
}

async function fetchFlatPoisForDestination(destinationId: string): Promise<FlatPoi[]> {
  const areas = await prisma.area.findMany({
    where: { destinationId },
    select: {
      name: true,
      categories: {
        select: {
          name: true,
          colorHex: true,
          pois: {
            select: {
              id: true,
              name: true,
              lat: true,
              lng: true,
              geometryType: true,
              geometryCoords: true,
              colorHex: true,
              iconCategory: true,
              address: true,
              priceRange: true,
              bookingUrl: true,
              tip: true,
              hours: true,
              rawDescriptionHtml: true,
              wantsBooking: true,
              isMustSee: true,
              tags: { select: { label: true } },
              photos: { take: 1, select: { url: true } },
            },
          },
        },
      },
    },
  });

  const flat: FlatPoi[] = [];
  for (const area of areas) {
    for (const category of area.categories) {
      for (const poi of category.pois) {
        flat.push({
          id: poi.id,
          name: poi.name,
          lat: poi.lat,
          lng: poi.lng,
          geometryType: poi.geometryType,
          geometryCoords: poi.geometryCoords ? (JSON.parse(poi.geometryCoords) as [number, number][]) : null,
          areaName: area.name,
          categoryName: category.name,
          categoryColor: category.colorHex,
          colorHex: poi.colorHex,
          iconCategory: poi.iconCategory,
          address: poi.address,
          priceRange: poi.priceRange,
          bookingUrl: poi.bookingUrl,
          tip: poi.tip,
          hours: poi.hours,
          tags: poi.tags.map((t) => t.label),
          photoUrl: poi.photos[0]?.url ?? null,
          description: extractTextDescription(poi.rawDescriptionHtml),
          wantsBooking: poi.wantsBooking,
          isMustSee: poi.isMustSee,
        });
      }
    }
  }
  return flat;
}
