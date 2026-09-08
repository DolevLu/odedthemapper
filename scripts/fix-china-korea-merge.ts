// Fix-up for import-2026-batch.ts: China's 5 selected regional files (Beijing,
// Hunan+Chongqing+Sichuan, Yunnan, Xi'an, Shanghai) don't cover several other
// regions (Qingdao, Harbin, Xiamen, Wuhan, Tibet, Xinjiang, Hainan, Guizhou,
// Luoyang, Dalian) that only exist in the general "עודד _ סין.kml" file,
// which wasn't in the original selection. Same issue for Korea: the general
// "עודד _ קוריאה.kml" (665 placemarks) has more content than the 3 selected
// city files summed to (485). Re-imports both destinations with the general
// file merged in alongside the already-selected regional ones.
import { readFileSync } from "node:fs";
import { PrismaClient } from "@prisma/client";
import { importKmlFilesToDestination } from "../src/lib/kml/importToDb";

const prisma = new PrismaClient({ datasourceUrl: process.env.POSTGRES_URL_NON_POOLING });
const DOWNLOADS = "C:/Users/dolev/Downloads";

const JOBS: { slug: string; files: string[] }[] = [
  {
    slug: "china",
    files: [
      "עודד _ סין.kml",
      "עודד _ סין - בייג׳ינג והסביבה.kml",
      "עודד _ סין - הונאן + צ׳ונגצ׳ינג + סיצ׳ואן (1).kml",
      "עודד _ סין - מפת יונאן המלאה (1).kml",
      "עודד _ סין - שיאן (1).kml",
      "עודד _ סין - שנגחאי והסביבה (1).kml",
    ],
  },
  {
    slug: "korea",
    files: [
      "עודד _ קוריאה.kml",
      "עודד _ קוריאה - אי ג׳גו.kml",
      "עודד _ קוריאה - בוסן.kml",
      "עודד _ קוריאה - סיאול.kml",
    ],
  },
];

async function main() {
  for (const job of JOBS) {
    const destination = await prisma.destination.findUniqueOrThrow({ where: { slug: job.slug } });
    const existingAreas = await prisma.area.count({ where: { destinationId: destination.id } });
    if (existingAreas > 0) {
      await prisma.area.deleteMany({ where: { destinationId: destination.id } });
      await prisma.kmlImport.deleteMany({ where: { destinationId: destination.id } });
      console.log(`${job.slug}: cleared ${existingAreas} areas from the incomplete reimport`);
    }
    const files = job.files.map((f) => ({ fileName: f, xml: readFileSync(`${DOWNLOADS}/${f}`, "utf-8") }));
    const result = await importKmlFilesToDestination(prisma, destination.id, files);
    console.log(
      `${job.slug}: merged ${job.files.length} files -> ${result.areasCreated} areas, ${result.categoriesCreated} categories, ${result.poisCreated} POIs`
    );
  }
}

main()
  .catch((e) => {
    console.error("FAILED", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
