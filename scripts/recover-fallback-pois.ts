// One more pass over every POI currently sitting on the generic fallback
// description (photos.length === 0) now that the Wikipedia lookup itself
// has retry logic (see fetchWithRetry in enrichPoi.ts) — confirmed live
// that at least some of these (Charles Bridge itself) only fell back
// because of a transient network failure during the original backfill, not
// because no matching article actually exists. Only overwrites a POI when a
// real match is found this time; otherwise leaves its fallback description
// untouched. Safe to interrupt/resume: re-running just re-checks whatever
// still has zero photos.
import { PrismaClient } from "@prisma/client";
import { findWikipediaEnrichment } from "../src/lib/kml/enrichPoi";

const prisma = new PrismaClient({ datasourceUrl: process.env.POSTGRES_URL_NON_POOLING });
const escapeHtml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function withRetry<T>(fn: () => Promise<T>, label: string, attempts = 5): Promise<T> {
  for (let i = 1; i <= attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      if (i === attempts) throw err;
      const delayMs = 2000 * i;
      console.log(`  [retry] ${label} failed (attempt ${i}/${attempts}), retrying in ${delayMs}ms: ${(err as Error).message}`);
      await sleep(delayMs);
    }
  }
  throw new Error("unreachable");
}

async function main() {
  const dests = await prisma.destination.findMany({ select: { id: true, slug: true } });
  let totalRecovered = 0;
  for (const d of dests) {
    let recovered = 0;
    let checked = 0;
    let lastId: string | null = null;
    for (;;) {
      // Cursor by id (not skip) — a recovered POI leaves the zero-photo
      // filter mid-run, which would shift skip-based offsets and either
      // skip over or re-process the wrong POIs; an id cursor stays correct
      // regardless of how many earlier POIs just left the set.
      const batch = await withRetry(
        () =>
          prisma.pointOfInterest.findMany({
            where: {
              category: { area: { destinationId: d.id } },
              geometryType: "point",
              photos: { none: {} },
              ...(lastId ? { id: { gt: lastId } } : {}),
            },
            select: { id: true, name: true, lat: true, lng: true },
            take: 20,
            orderBy: { id: "asc" },
          }),
        `${d.slug}: fetch batch`
      );
      if (batch.length === 0) break;
      lastId = batch[batch.length - 1].id;

      for (const poi of batch) {
        const result = await findWikipediaEnrichment(poi.name, poi.lat, poi.lng, 2);
        if (result.description || result.photos.length > 0) {
          await withRetry(
            () =>
              prisma.pointOfInterest.update({
                where: { id: poi.id },
                data: { ...(result.description ? { rawDescriptionHtml: `<p>${escapeHtml(result.description)}</p>` } : {}) },
              }),
            `${d.slug}: recover ${poi.name}`
          );
          if (result.photos.length > 0) {
            await withRetry(
              () => prisma.poiPhoto.createMany({ data: result.photos.map((url) => ({ poiId: poi.id, url })) }),
              `${d.slug}: recover photos for ${poi.name}`
            );
          }
          recovered++;
        }
        checked++;
        if (checked % 50 === 0) console.log(`  [${d.slug}] ${checked} re-checked, ${recovered} recovered so far...`);
        await sleep(400);
      }
    }
    if (checked > 0) {
      console.log(`${d.slug}: done, re-checked ${checked}, recovered ${recovered}`);
      totalRecovered += recovered;
    }
  }
  console.log(`\nALL DESTINATIONS DONE — total recovered: ${totalRecovered}`);
}

main()
  .catch((e) => {
    console.error("FAILED", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
