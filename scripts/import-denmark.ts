// One-off: creates the Denmark destination (doesn't exist yet — confirmed
// directly against the DB) and imports the user's KML export into it,
// mirroring exactly what createDestination + uploadKml do together from the
// admin panel, since this needs to run from a script rather than the UI.
// Direct (non-pooled) connection, same reasoning as enrich-all-destinations.ts.
import { readFileSync } from "fs";
import { PrismaClient } from "@prisma/client";
import { importKmlFilesToDestination } from "../src/lib/kml/importToDb";
import { getPhrasebookSeedForSlug } from "../src/lib/phrasebookSeeds";

const prisma = new PrismaClient({ datasourceUrl: process.env.POSTGRES_URL_NON_POOLING });

const SLUG = "denmark";
const NAME = "דנמרק";
const KML_PATH = "C:/Users/dolev/Downloads/דנמרק_מועשר (3).kml";

// "nordic-blue" starter theme (src/lib/theme/starterThemes.ts) — dusty blue
// and warm wood, explicitly themed around Scandinavian hygge. A genuinely
// good fit, not just the first option.
const THEME = {
  palette: { primary: "#3E5C76", secondary: "#C9A66B", accent: "#D97757", background: "#F5F1EA", surface: "#FFFFFF", text: "#25272B" },
  shape: "rounded",
  mood: "Hygge Scandinavian calm, dusty blue and warm wood.",
};

async function main() {
  const existing = await prisma.destination.findUnique({ where: { slug: SLUG } });
  if (existing) {
    console.log(`"${SLUG}" already exists (id ${existing.id}) — not creating again. Re-run enrichment instead if needed.`);
    return;
  }

  const destination = await prisma.destination.create({
    data: {
      slug: SLUG,
      name: NAME,
      continent: "europe",
      isBestSeller: false,
      status: "draft",
      themeConfig: JSON.stringify(THEME),
    },
  });
  console.log(`Created destination ${SLUG} (${destination.id})`);

  const xml = readFileSync(KML_PATH, "utf-8");
  const result = await importKmlFilesToDestination(prisma, destination.id, [{ fileName: "denmark.kml", xml }]);
  console.log("Import result:", result);

  const seed = getPhrasebookSeedForSlug(SLUG);
  if (seed.length > 0) {
    await prisma.phrasebookEntry.createMany({ data: seed.map((p) => ({ destinationId: destination.id, ...p })) });
    console.log(`Seeded ${seed.length} phrasebook entries`);
  } else {
    console.log("No phrasebook seed available for this slug — skipped");
  }

  // Matches uploadKml's own behavior: a fresh draft flips to "preview" once
  // it actually has content, and enrich-all-destinations.ts only picks up
  // non-draft destinations.
  await prisma.destination.update({ where: { id: destination.id }, data: { status: "preview" } });
  console.log("Status set to preview. Denmark is ready for enrichment.");
}

main()
  .catch((e) => {
    console.error("FAILED", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
