// Replaces Japan's content with a newer, richer KML export (9 real area
// folders: Hokkaido/Tokyo/Fuji Area/Nagoya/Kyoto/Osaka/Hiroshima/Kyushu/Road
// Trip — matches importKmlToDestination's expected Folder>Folder>Placemark
// shape once you account for `<Folder id="...">` not being a bare
// `<Folder>` tag). Re-verified live before running this: japan has zero
// favorites/saved pins/itinerary items/packing checks referencing its
// current POIs — the only rows referencing it are one DestinationAccess and
// one SubscriptionDestination for the owner's own rogerthemapper@gmail.com
// dev account, neither of which is per-POI content, so this mirrors
// uploadKml's own "replace" behavior rather than needing a merge.
import { readFileSync } from "fs";
import { PrismaClient } from "@prisma/client";
import { importKmlFilesToDestination } from "../src/lib/kml/importToDb";

const prisma = new PrismaClient({ datasourceUrl: process.env.POSTGRES_URL_NON_POOLING });

const SLUG = "japan";
const KML_PATH = "C:/Users/dolev/Downloads/עודד _ יפן (2).kml";

async function main() {
  const destination = await prisma.destination.findUnique({ where: { slug: SLUG } });
  if (!destination) throw new Error(`"${SLUG}" doesn't exist — expected it to already exist`);

  const [favCount, savedPinCount, itemCount, packingCount] = await Promise.all([
    prisma.favorite.count({ where: { poi: { category: { area: { destinationId: destination.id } } } } }),
    prisma.savedMapPin.count({ where: { destinationId: destination.id } }),
    prisma.itineraryItem.count({ where: { poi: { category: { area: { destinationId: destination.id } } } } }),
    prisma.packingCheck.count({ where: { destinationId: destination.id } }),
  ]);
  if (favCount + savedPinCount + itemCount + packingCount > 0) {
    throw new Error(
      `Refusing to replace ${SLUG}'s content: found existing user data (favorites=${favCount}, savedPins=${savedPinCount}, itineraryItems=${itemCount}, packingChecks=${packingCount}). This script only does a safe blind replace when nothing references the existing POIs.`
    );
  }

  console.log(`Deleting existing content for ${SLUG}...`);
  await prisma.area.deleteMany({ where: { destinationId: destination.id } });
  await prisma.kmlImport.deleteMany({ where: { destinationId: destination.id } });

  const xml = readFileSync(KML_PATH, "utf-8");
  const result = await importKmlFilesToDestination(prisma, destination.id, [{ fileName: "japan-2.kml", xml }]);
  console.log("Import result:", result);

  if (destination.status === "draft") {
    await prisma.destination.update({ where: { id: destination.id }, data: { status: "preview" } });
  }
  console.log("Done. Japan is ready for naming + enrichment.");
}

main()
  .catch((e) => {
    console.error("FAILED", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
