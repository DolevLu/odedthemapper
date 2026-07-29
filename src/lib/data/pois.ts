import { prisma } from "@/lib/prisma";

export type FlatPoi = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  geometryType: string;
  areaName: string;
  categoryName: string;
  categoryColor: string;
  address: string | null;
  priceRange: string | null;
  bookingUrl: string | null;
  tip: string | null;
  photoUrl: string | null;
  description: string | null;
};

/** Strips <img> tags and remaining HTML markup from a KML description blob,
 * leaving just the human-readable text (the photo is shown separately). */
export function extractTextDescription(html: string | null): string | null {
  if (!html) return null;
  const withoutImages = html.replace(/<img[^>]*>/gi, "");
  const text = withoutImages
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return text || null;
}

export async function getFlatPoisForDestination(destinationId: string): Promise<FlatPoi[]> {
  const areas = await prisma.area.findMany({
    where: { destinationId },
    include: {
      categories: {
        include: { pois: { include: { photos: { take: 1 } } } },
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
          areaName: area.name,
          categoryName: category.name,
          categoryColor: category.colorHex,
          address: poi.address,
          priceRange: poi.priceRange,
          bookingUrl: poi.bookingUrl,
          tip: poi.tip,
          photoUrl: poi.photos[0]?.url ?? null,
          description: extractTextDescription(poi.rawDescriptionHtml),
        });
      }
    }
  }
  return flat;
}
