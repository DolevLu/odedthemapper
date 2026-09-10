// One-off backfill prep: enrich-wiki-batch.ts only reprocesses POIs whose
// enrichedAt is null, but the earlier Wikipedia-only pass already marked
// every POI "enriched" even when no matching article existed (needsDescription
// stayed true, nothing was written). This resets enrichedAt back to null for
// exactly those still-descriptionless (or still-boilerplate) point POIs so
// the next enrich-wiki-batch.ts run applies its new fallback description
// (see buildFallbackDescription) to them — never touches POIs that already
// have a real description.
import { PrismaClient } from "@prisma/client";
import { extractTextDescription } from "../src/lib/data/pois";

const prisma = new PrismaClient({ datasourceUrl: process.env.POSTGRES_URL_NON_POOLING });
const GENERIC_DESCRIPTION_MARKERS = ["נקודה שסומנה במסלול", "מומלץ לבדוק שעות פתיחה"];

async function main() {
  const dests = await prisma.destination.findMany({ select: { id: true, slug: true } });
  let totalReset = 0;
  for (const d of dests) {
    const pois = await prisma.pointOfInterest.findMany({
      where: { category: { area: { destinationId: d.id } }, geometryType: "point", enrichedAt: { not: null } },
      select: { id: true, rawDescriptionHtml: true },
    });
    const idsToReset = pois
      .filter((p) => {
        const text = extractTextDescription(p.rawDescriptionHtml);
        return !text || GENERIC_DESCRIPTION_MARKERS.some((m) => text.includes(m));
      })
      .map((p) => p.id);
    if (idsToReset.length > 0) {
      await prisma.pointOfInterest.updateMany({ where: { id: { in: idsToReset } }, data: { enrichedAt: null } });
      console.log(`${d.slug}: reset ${idsToReset.length} POIs for fallback-description backfill`);
      totalReset += idsToReset.length;
    }
  }
  console.log(`\nTOTAL RESET: ${totalReset}`);
}

main()
  .catch((e) => {
    console.error("FAILED", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
