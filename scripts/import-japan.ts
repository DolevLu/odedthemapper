// Japan already exists in the DB (imported 2026-07-29) but has zero
// favorites/saved pins/itinerary items/packing checks referencing any of its
// POIs — confirmed directly against the DB before running this. Since
// nothing is actually at risk, this mirrors uploadKml's own "replace"
// behavior (delete existing content, import fresh) rather than needing a
// name/coordinate merge — there's nothing to merge against.
import { readFileSync } from "fs";
import { PrismaClient } from "@prisma/client";
import { importKmlFilesToDestination } from "../src/lib/kml/importToDb";

const prisma = new PrismaClient({ datasourceUrl: process.env.POSTGRES_URL_NON_POOLING });

const SLUG = "japan";
const KML_PATH = "C:/Users/dolev/Downloads/יפן_מועשר (1).kml";

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
  const result = await importKmlFilesToDestination(prisma, destination.id, [{ fileName: "japan.kml", xml }]);
  console.log("Import result:", result);

  if (destination.status === "draft") {
    await prisma.destination.update({ where: { id: destination.id }, data: { status: "preview" } });
  }
  console.log("Done. Japan is ready for enrichment.");
}

main()
  .catch((e) => {
    console.error("FAILED", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
