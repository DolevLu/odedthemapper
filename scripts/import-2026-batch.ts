// One-off batch import for the 2026 KML refresh: replaces existing content
// for 12 single-file destinations, merges multi-file destinations (China,
// France, Korea), and creates 6 brand-new destinations from scratch. See the
// conversation this ran from for the full file->destination mapping this
// mirrors.
import { readFileSync } from "node:fs";
import { PrismaClient } from "@prisma/client";
import { importKmlFilesToDestination } from "../src/lib/kml/importToDb";
import { themePresets } from "../src/lib/theme/presets";

const prisma = new PrismaClient({ datasourceUrl: process.env.POSTGRES_URL_NON_POOLING });

const DOWNLOADS = "C:/Users/dolev/Downloads";

type Job = {
  slug: string;
  files: string[];
  // Only set for brand-new destinations.
  create?: { name: string; tagline: string; continent: string; themeKey: keyof typeof themePresets };
};

const JOBS: Job[] = [
  { slug: "argentina", files: ["🇦🇷 ארגנטינה (1).kml"] },
  { slug: "philippines", files: ["עודד - הפיליפינים (2).kml"] },
  { slug: "laos", files: ["עודד - לאוס (1).kml"] },
  { slug: "netherlands", files: ["עודד _ הולנד (1).kml"] },
  { slug: "tanzania", files: ["עודד _ טנזניה וזנזיבר (1).kml"] },
  { slug: "greece", files: ["עודד _ יוון - אתונה.kml"] },
  { slug: "norway", files: ["עודד _ נורבגיה המפה המלאה (1).kml"] },
  { slug: "spain", files: ["עודד _ ספרד (1).kml"] },
  { slug: "portugal", files: ["עודד _ פורטוגל (1).kml"] },
  { slug: "cyprus", files: ["עודד _ קפריסין (1).kml"] },
  { slug: "croatia", files: ["עודד _ קרואטיה (1).kml"] },
  { slug: "romania", files: ["עודד _ רומניה (1).kml"] },
  {
    slug: "china",
    files: [
      "עודד _ סין - בייג׳ינג והסביבה.kml",
      "עודד _ סין - הונאן + צ׳ונגצ׳ינג + סיצ׳ואן (1).kml",
      "עודד _ סין - מפת יונאן המלאה (1).kml",
      "עודד _ סין - שיאן (1).kml",
      "עודד _ סין - שנגחאי והסביבה (1).kml",
    ],
  },
  { slug: "france", files: ["עודד _ צרפת - פריז.kml", "עודד _ צרפת (1).kml"] },
  { slug: "korea", files: ["עודד _ קוריאה - אי ג׳גו.kml", "עודד _ קוריאה - בוסן.kml", "עודד _ קוריאה - סיאול.kml"] },
  {
    slug: "estonia",
    files: ["עודד _ אסטוניה.kml"],
    create: { name: "אסטוניה", tagline: "טאלין - העיר העתיקה השמורה ביותר בבלטים", continent: "europe", themeKey: "estonia" },
  },
  {
    slug: "latvia",
    files: ["עודד _ לטביה.kml"],
    create: { name: "לטביה", tagline: "ריגה - אדריכלות ארט-נובו וקסם בלטי", continent: "europe", themeKey: "latvia" },
  },
  {
    slug: "lithuania",
    files: ["עודד _ ליטא.kml"],
    create: { name: "ליטא", tagline: "וילנה - עיר עתיקה בארוקית וענבר בלטי", continent: "europe", themeKey: "lithuania" },
  },
  {
    slug: "malta",
    files: ["עודד _ מלטה.kml"],
    create: { name: "מלטה", tagline: "איי גיר ושמש בין מבצרים לים התיכון", continent: "europe", themeKey: "malta" },
  },
  {
    slug: "switzerland",
    files: ["עודד _ שוויץ.kml"],
    create: { name: "שוויץ", tagline: "האלפים, אגמים כחולים וערים נקיות", continent: "europe", themeKey: "switzerland" },
  },
  {
    slug: "hongkong",
    files: ["עודד _ הונג קונג ומקאו.kml"],
    create: { name: "הונג קונג ומקאו", tagline: "גורדי שחקים, נאונים ומקאו הקולוניאלית", continent: "asia", themeKey: "hongkong" },
  },
];

async function main() {
  for (const job of JOBS) {
    let destination = await prisma.destination.findUnique({ where: { slug: job.slug } });

    if (!destination && job.create) {
      const theme = themePresets[job.create.themeKey];
      destination = await prisma.destination.create({
        data: {
          slug: job.slug,
          name: job.create.name,
          tagline: job.create.tagline,
          status: "preview",
          themeConfig: JSON.stringify(theme),
          continent: job.create.continent,
        },
      });
      console.log(`${job.slug}: created new destination`);
    }
    if (!destination) throw new Error(`${job.slug}: no existing destination and no create{} config`);

    const existingAreas = await prisma.area.count({ where: { destinationId: destination.id } });
    if (existingAreas > 0) {
      await prisma.area.deleteMany({ where: { destinationId: destination.id } });
      await prisma.kmlImport.deleteMany({ where: { destinationId: destination.id } });
      console.log(`${job.slug}: cleared ${existingAreas} existing areas + KML history`);
    }

    const files = job.files.map((f) => ({ fileName: f, xml: readFileSync(`${DOWNLOADS}/${f}`, "utf-8") }));
    const result = await importKmlFilesToDestination(prisma, destination.id, files);
    console.log(
      `${job.slug}: imported ${job.files.length} file(s) -> ${result.areasCreated} areas, ${result.categoriesCreated} categories, ${result.poisCreated} POIs`
    );
  }
  console.log("BATCH IMPORT DONE");
}

main()
  .catch((e) => {
    console.error("FAILED", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
