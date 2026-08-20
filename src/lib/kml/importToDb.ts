import { PrismaClient } from "@prisma/client";
import { parseKml } from "./parse";

const IMG_SRC_RE = /<img[^>]+src="([^"]+)"/g;

function extractPhotoUrls(html: string | null): string[] {
  if (!html) return [];
  const urls: string[] = [];
  let match: RegExpExecArray | null;
  IMG_SRC_RE.lastIndex = 0;
  while ((match = IMG_SRC_RE.exec(html))) urls.push(match[1]);
  return urls;
}

export type KmlImportResult = {
  kmlImportId: string;
  areasCreated: number;
  categoriesCreated: number;
  poisCreated: number;
};

/**
 * Parses a KML document and writes it into the DB for the given destination.
 * Idempotent-ish: each call creates a fresh KmlImport record and fresh
 * Area/Category/POI rows — re-running against the same destination will
 * duplicate content, so this is meant to run once per reviewed import.
 */
export async function importKmlToDestination(
  prisma: PrismaClient,
  destinationId: string,
  fileName: string,
  xml: string
): Promise<KmlImportResult> {
  const parsed = parseKml(xml);

  let categoriesCreated = 0;
  let poisCreated = 0;

  const kmlImport = await prisma.kmlImport.create({
    data: {
      destinationId,
      fileName,
      rawXml: xml,
      status: "pending_review",
      placemarkCount: parsed.areas.reduce(
        (sum, a) => sum + a.categories.reduce((s, c) => s + c.pois.length, 0),
        0
      ),
    },
  });

  for (const area of parsed.areas) {
    const areaRow = await prisma.area.create({
      data: {
        destinationId,
        name: area.name,
      },
    });

    for (const category of area.categories) {
      const categoryRow = await prisma.category.create({
        data: {
          areaId: areaRow.id,
          name: category.name,
          colorHex: category.colorHex,
        },
      });
      categoriesCreated += 1;

      for (const poi of category.pois) {
        const photoUrls = extractPhotoUrls(poi.descriptionHtml);
        await prisma.pointOfInterest.create({
          data: {
            categoryId: categoryRow.id,
            name: poi.name,
            lat: poi.lat,
            lng: poi.lng,
            geometryType: poi.geometryType,
            geometryCoords: poi.geometryCoords ? JSON.stringify(poi.geometryCoords) : null,
            colorHex: poi.colorHex,
            rawDescriptionHtml: poi.descriptionHtml,
            photos: { create: photoUrls.map((url) => ({ url })) },
          },
        });
        poisCreated += 1;
      }
    }
  }

  return {
    kmlImportId: kmlImport.id,
    areasCreated: parsed.areas.length,
    categoriesCreated,
    poisCreated,
  };
}
