import { readFileSync } from "node:fs";
import { join } from "node:path";
import { prisma } from "../src/lib/prisma";
import { importKmlToDestination } from "../src/lib/kml/importToDb";

async function main() {
  const slug = process.argv[2];
  if (!slug) throw new Error("Usage: tsx scripts/reimport-destination.ts <slug>");

  const destination = await prisma.destination.findUniqueOrThrow({ where: { slug } });
  await prisma.area.deleteMany({ where: { destinationId: destination.id } });
  await prisma.kmlImport.deleteMany({ where: { destinationId: destination.id } });

  const xml = readFileSync(join(__dirname, "..", "fixtures", "kml", `${slug}.kml`), "utf-8");
  const result = await importKmlToDestination(prisma, destination.id, `${slug}.kml`, xml);
  console.log(
    `Re-imported ${slug}: ${result.areasCreated} areas, ${result.categoriesCreated} categories, ${result.poisCreated} POIs.`
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
