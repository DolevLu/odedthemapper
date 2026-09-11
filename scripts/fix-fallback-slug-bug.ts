// One-off repair: buildFallbackDescription (enrich-wiki-batch.ts) was called
// with the destination's URL slug instead of its Hebrew display name, so
// every fallback description written by the big backfill run ends with the
// English slug instead of a real Hebrew destination name (e.g. "באזור פראג,
// prague." instead of "באזור פראג, פראג."). Fixed at the source for future
// runs; this repairs the rows already written without re-running the
// multi-hour Wikipedia pass — every fallback description has the exact
// `, <slug>.</p>` suffix (see buildFallbackDescription's template), so a
// straight string replace of that suffix is safe and unambiguous.
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient({ datasourceUrl: process.env.POSTGRES_URL_NON_POOLING });

async function main() {
  const dests = await prisma.destination.findMany({ select: { id: true, slug: true, name: true } });
  let totalFixed = 0;
  for (const d of dests) {
    const badSuffix = `, ${d.slug}.</p>`;
    const goodSuffix = `, ${d.name}.</p>`;
    if (badSuffix === goodSuffix) continue;
    const pois = await prisma.pointOfInterest.findMany({
      where: { category: { area: { destinationId: d.id } }, rawDescriptionHtml: { endsWith: badSuffix } },
      select: { id: true, rawDescriptionHtml: true },
    });
    if (pois.length === 0) continue;
    for (const p of pois) {
      const fixed = p.rawDescriptionHtml!.slice(0, -badSuffix.length) + goodSuffix;
      await prisma.pointOfInterest.update({ where: { id: p.id }, data: { rawDescriptionHtml: fixed } });
    }
    console.log(`${d.slug}: fixed ${pois.length} fallback descriptions`);
    totalFixed += pois.length;
  }
  console.log(`\nTOTAL FIXED: ${totalFixed}`);
}

main()
  .catch((e) => {
    console.error("FAILED", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
