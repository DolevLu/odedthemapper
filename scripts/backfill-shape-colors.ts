// Fills in colorHex on existing line/polygon POIs that predate the
// per-placemark color fix — pure in-place UPDATE, no delete/recreate, so it
// can't touch anyone's favorites/itinerary items/wantsBooking flags. Safe to
// run against live destinations.
import { prisma } from "../src/lib/prisma";
import { parseKml } from "../src/lib/kml/parse";

async function main() {
  const destinations = await prisma.destination.findMany({
    include: { kmlImports: true, areas: { include: { categories: { include: { pois: true } } } } },
  });

  let totalUpdated = 0;
  for (const dest of destinations) {
    if (dest.kmlImports.length === 0) continue;

    // Map of "geometryType|name" -> parsed colorHex, across every stored
    // KML file for this destination (last one wins on a name collision,
    // matching how a merged multi-file import would resolve it too).
    const colorByKey = new Map<string, string>();
    for (const imp of dest.kmlImports) {
      const parsed = parseKml(imp.rawXml);
      for (const area of parsed.areas) {
        for (const category of area.categories) {
          for (const poi of category.pois) {
            if (poi.geometryType === "point") continue;
            colorByKey.set(`${poi.geometryType}|${poi.name}`, poi.colorHex);
          }
        }
      }
    }
    if (colorByKey.size === 0) continue;

    const existingShapes = dest.areas
      .flatMap((a) => a.categories)
      .flatMap((c) => c.pois)
      .filter((p) => p.geometryType !== "point" && !p.colorHex);

    let updatedForDest = 0;
    for (const poi of existingShapes) {
      const color = colorByKey.get(`${poi.geometryType}|${poi.name}`);
      if (!color) continue;
      await prisma.pointOfInterest.update({ where: { id: poi.id }, data: { colorHex: color } });
      updatedForDest++;
    }
    if (updatedForDest > 0) {
      console.log(`${dest.slug}: updated ${updatedForDest}/${existingShapes.length} shapes`);
      totalUpdated += updatedForDest;
    }
  }
  console.log("TOTAL updated:", totalUpdated);
}

main()
  .catch((e) => {
    console.error("FAILED", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
