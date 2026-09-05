// Japan-specific variant of enrich-all-destinations.ts: same photo/
// description enrichment pipeline, but requests an ENGLISH description from
// Gemini instead of Hebrew (see generateDescriptionAndWebsite's `language`
// param) since Japan's POI names are now English/romanized (see
// rename-japan-english.ts) rather than Hebrew like the rest of the app's
// destinations — a Hebrew description under a romaji name would read oddly,
// and English is the standard register for Japanese place names anyway.
// Every other destination keeps the default Hebrew behavior untouched.
import { PrismaClient } from "@prisma/client";
import { extractTextDescription } from "../src/lib/data/pois";
import { findWikipediaPhotos, generateDescriptionAndWebsite, GeminiQuotaExceededError } from "../src/lib/kml/enrichPoi";

const prisma = new PrismaClient({ datasourceUrl: process.env.POSTGRES_URL_NON_POOLING });

const SLUG = "japan";
const GENERIC_PHOTO_MIN_REUSE = 4;
const escapeHtml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

async function withRetry<T>(fn: () => Promise<T>, label: string, attempts = 5): Promise<T> {
  for (let i = 1; i <= attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      if (i === attempts) throw err;
      const delayMs = 2000 * i;
      console.log(`  [retry] ${label} failed (attempt ${i}/${attempts}), retrying in ${delayMs}ms: ${(err as Error).message}`);
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
  throw new Error("unreachable");
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  const dest = await withRetry(() => prisma.destination.findUniqueOrThrow({ where: { slug: SLUG } }), `${SLUG}: lookup`);

  const photoRows = await prisma.poiPhoto.findMany({
    where: { poi: { category: { area: { destinationId: dest.id } } } },
    select: { url: true, poiId: true },
  });
  const poiIdsByUrl = new Map<string, Set<string>>();
  for (const p of photoRows) {
    if (!poiIdsByUrl.has(p.url)) poiIdsByUrl.set(p.url, new Set());
    poiIdsByUrl.get(p.url)!.add(p.poiId);
  }
  const genericPhotoUrls = new Set(
    [...poiIdsByUrl.entries()].filter(([, poiIds]) => poiIds.size >= GENERIC_PHOTO_MIN_REUSE).map(([url]) => url)
  );

  let processed = 0;
  for (;;) {
    const batch = await withRetry(
      () =>
        prisma.pointOfInterest.findMany({
          where: { category: { area: { destinationId: dest.id } }, geometryType: "point", enrichedAt: null },
          include: { category: { include: { area: true } }, photos: { select: { url: true } } },
          take: 20,
          orderBy: { id: "asc" },
        }),
      `${SLUG}: fetch batch`
    );
    if (batch.length === 0) break;

    for (const poi of batch) {
      const descriptionText = extractTextDescription(poi.rawDescriptionHtml);
      const needsDescription = !descriptionText;
      const hasRealPhoto = poi.photos.some((p) => !genericPhotoUrls.has(p.url));
      const needsPhoto = !hasRealPhoto;
      const needsWebsite = !poi.website;

      if (!needsDescription && !needsPhoto && !needsWebsite) {
        await withRetry(
          () => prisma.pointOfInterest.update({ where: { id: poi.id }, data: { enrichedAt: new Date() } }),
          `${SLUG}: mark ${poi.name} enriched`
        );
      } else {
        const photoUrls = needsPhoto ? await findWikipediaPhotos(poi.name, poi.lat, poi.lng, 2) : [];
        if (needsPhoto && photoUrls.length > 0) {
          await withRetry(
            () => prisma.poiPhoto.createMany({ data: photoUrls.map((url) => ({ poiId: poi.id, url })) }),
            `${SLUG}: create photos for ${poi.name}`
          );
        }

        let aiResult: { description: string | null; website: string | null };
        try {
          aiResult =
            needsDescription || needsWebsite
              ? await generateDescriptionAndWebsite(poi.name, poi.category.name, poi.category.area.name, dest.name, poi.lat, poi.lng, "en")
              : { description: null, website: null };
        } catch (err) {
          if (err instanceof GeminiQuotaExceededError) {
            console.log(`Gemini daily quota exhausted at "${poi.name}" (processed ${processed} so far) — stopping run, will resume later.`);
            console.log(`DONE — processed ${processed} total (stopped early: quota exhausted)`);
            await prisma.$disconnect();
            process.exit(0);
          }
          throw err;
        }

        // Only claim "enriched" for what we actually got a real answer for —
        // a null description/website here means Gemini WAS reachable and
        // confidently said "I don't know", which is a legitimate final
        // answer worth caching (unlike the quota case above, which never
        // reaches this line).
        await withRetry(
          () =>
            prisma.pointOfInterest.update({
              where: { id: poi.id },
              data: {
                enrichedAt: new Date(),
                ...(needsWebsite && aiResult.website ? { website: aiResult.website } : {}),
                ...(needsDescription && aiResult.description ? { rawDescriptionHtml: `<p>${escapeHtml(aiResult.description)}</p>` } : {}),
              },
            }),
          `${SLUG}: update ${poi.name}`
        );
      }
      processed++;
      if (processed % 25 === 0) console.log(`  [${SLUG}] ${processed} processed so far...`);
      await sleep(400); // cap sustained DB/API throughput, same as enrich-all-destinations.ts
    }
  }
  console.log(`DONE — processed ${processed} total`);
}

main()
  .catch((e) => {
    console.error("FAILED", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
