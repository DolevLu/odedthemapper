// Fix-up for import-2026-batch.ts: the selected "יוון - אתונה" file was an
// Athens-only 80-POI file, but Greece's existing content (510 POIs) came
// from the broader "יוון" file, which also has its own Athens folder — the
// initial reimport replaced the whole country with just the Athens subset.
// Re-imports both files together (general + Athens), matching the same
// multi-file merge already used for France/China/Korea.
import { readFileSync } from "node:fs";
import { PrismaClient } from "@prisma/client";
import { importKmlFilesToDestination } from "../src/lib/kml/importToDb";

const prisma = new PrismaClient({ datasourceUrl: process.env.POSTGRES_URL_NON_POOLING });
const DOWNLOADS = "C:/Users/dolev/Downloads";

async function main() {
  const destination = await prisma.destination.findUniqueOrThrow({ where: { slug: "greece" } });
  const existingAreas = await prisma.area.count({ where: { destinationId: destination.id } });
  if (existingAreas > 0) {
    await prisma.area.deleteMany({ where: { destinationId: destination.id } });
    await prisma.kmlImport.deleteMany({ where: { destinationId: destination.id } });
    console.log(`greece: cleared ${existingAreas} areas from the Athens-only reimport`);
  }

  const files = ["עודד _ יוון.kml", "עודד _ יוון - אתונה.kml"].map((f) => ({
    fileName: f,
    xml: readFileSync(`${DOWNLOADS}/${f}`, "utf-8"),
  }));
  const result = await importKmlFilesToDestination(prisma, destination.id, files);
  console.log(`greece: merged 2 files -> ${result.areasCreated} areas, ${result.categoriesCreated} categories, ${result.poisCreated} POIs`);
}

main()
  .catch((e) => {
    console.error("FAILED", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
