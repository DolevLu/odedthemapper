import { randomUUID } from "crypto";
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
 *
 * Everything runs inside one interactive transaction. Two things forced
 * this: (1) POI/photo writes are batched via createMany (up to ~2000+
 * placemarks per destination — one create() per row was slow enough to risk
 * running past a serverless function's time limit partway through, which is
 * exactly what happened once: an import silently completed for some POIs
 * but the destination never got flipped out of "draft"); (2) over Supabase's
 * pooled connection, separate non-transactional calls can land on different
 * backend connections, and a later call referencing a row committed on a
 * *different* connection a moment earlier can intermittently fail its
 * foreign key check — observed directly, twice, at different points in this
 * function (a category's POI insert, then an area's own category insert)
 * before everything was put on one connection via a single transaction.
 */
export async function importKmlToDestination(
  prisma: PrismaClient,
  destinationId: string,
  fileName: string,
  xml: string
): Promise<KmlImportResult> {
  const parsed = parseKml(xml);
  const totalPlacemarks = parsed.areas.reduce((sum, a) => sum + a.categories.reduce((s, c) => s + c.pois.length, 0), 0);

  return prisma.$transaction(
    async (tx) => {
      let categoriesCreated = 0;
      let poisCreated = 0;

      const kmlImport = await tx.kmlImport.create({
        data: {
          destinationId,
          fileName,
          rawXml: xml,
          status: "pending_review",
          placemarkCount: totalPlacemarks,
        },
      });

      for (const area of parsed.areas) {
        const areaRow = await tx.area.create({
          data: { destinationId, name: area.name },
        });

        for (const category of area.categories) {
          const categoryRow = await tx.category.create({
            data: {
              areaId: areaRow.id,
              name: category.name,
              colorHex: category.colorHex,
            },
          });
          categoriesCreated += 1;

          // IDs generated here (crypto.randomUUID(), not the schema's
          // default cuid()) so photo rows can reference their POI in the
          // same pass — createMany doesn't return the inserted rows.
          const poiRows = category.pois.map((poi) => ({
            id: randomUUID(),
            categoryId: categoryRow.id,
            name: poi.name,
            lat: poi.lat,
            lng: poi.lng,
            geometryType: poi.geometryType,
            geometryCoords: poi.geometryCoords ? JSON.stringify(poi.geometryCoords) : null,
            colorHex: poi.colorHex,
            rawDescriptionHtml: poi.descriptionHtml,
          }));
          if (poiRows.length > 0) {
            await tx.pointOfInterest.createMany({ data: poiRows });
          }
          poisCreated += poiRows.length;

          const photoRows = category.pois.flatMap((poi, idx) =>
            extractPhotoUrls(poi.descriptionHtml).map((url) => ({ id: randomUUID(), poiId: poiRows[idx].id, url }))
          );
          if (photoRows.length > 0) {
            await tx.poiPhoto.createMany({ data: photoRows });
          }
        }
      }

      return {
        kmlImportId: kmlImport.id,
        areasCreated: parsed.areas.length,
        categoriesCreated,
        poisCreated,
      };
    },
    // Default interactive-transaction timeout (5s) is too tight for a large
    // destination even with batched writes (many categories = many
    // createMany round-trips, still sequential within the transaction).
    { timeout: 45_000, maxWait: 15_000 }
  );
}
