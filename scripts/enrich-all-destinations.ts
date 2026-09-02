// Runs the same AI enrichment logic as the admin panel's button, but across
// every destination, to completion, in one long-running process — resumable
// by design (enrichedAt marks progress), so re-running after an interruption
// just continues where it left off instead of redoing work.
//
// Uses its own PrismaClient on the direct (non-pooled) connection rather than
// the app's shared pooled client: this script has already died twice on
// P1001 "Can't reach database server" against the pooler (port 6543) after a
// few hundred sequential requests — Supabase's transaction-mode PgBouncer
// doesn't tolerate a long-lived script issuing one request at a time with
// network round-trips (Wikipedia/Gemini calls) between them nearly as well
// as the direct connection does.
import { PrismaClient } from "@prisma/client";
import { extractTextDescription } from "../src/lib/data/pois";
import { findWikipediaPhotos, generateDescriptionAndWebsite } from "../src/lib/kml/enrichPoi";

const prisma = new PrismaClient({ datasourceUrl: process.env.POSTGRES_URL_NON_POOLING });

const GENERIC_DESCRIPTION_MARKERS = ["נקודה שסומנה במסלול", "מומלץ לבדוק שעות פתיחה"];
const GENERIC_PHOTO_MIN_REUSE = 4;
const escapeHtml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// A single transient pooler/network drop shouldn't kill a multi-hour run —
// retry a few times with backoff before actually giving up on this POI.
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

async function enrichDestination(destinationId: string, destinationName: string, slug: string) {
  const photoRows = await prisma.poiPhoto.findMany({
    where: { poi: { category: { area: { destinationId } } } },
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
          where: { category: { area: { destinationId } }, geometryType: "point", enrichedAt: null },
          include: { category: { include: { area: true } }, photos: { select: { url: true } } },
          take: 20,
          orderBy: { id: "asc" },
        }),
      `${slug}: fetch batch`
    );
    if (batch.length === 0) break;

    for (const poi of batch) {
      const descriptionText = extractTextDescription(poi.rawDescriptionHtml);
      const needsDescription = !descriptionText || GENERIC_DESCRIPTION_MARKERS.some((m) => descriptionText.includes(m));
      const hasRealPhoto = poi.photos.some((p) => !genericPhotoUrls.has(p.url));
      const needsPhoto = !hasRealPhoto;
      const needsWebsite = !poi.website;

      if (!needsDescription && !needsPhoto && !needsWebsite) {
        await withRetry(
          () => prisma.pointOfInterest.update({ where: { id: poi.id }, data: { enrichedAt: new Date() } }),
          `${slug}: mark ${poi.name} enriched`
        );
      } else {
        const photoUrls = needsPhoto ? await findWikipediaPhotos(poi.name, poi.lat, poi.lng, 2) : [];
        const aiResult =
          needsDescription || needsWebsite
            ? await generateDescriptionAndWebsite(poi.name, poi.category.name, poi.category.area.name, destinationName, poi.lat, poi.lng)
            : { description: null, website: null };

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
          `${slug}: update ${poi.name}`
        );
        if (needsPhoto && photoUrls.length > 0) {
          await withRetry(
            () => prisma.poiPhoto.createMany({ data: photoUrls.map((url) => ({ poiId: poi.id, url })) }),
            `${slug}: create photos for ${poi.name}`
          );
        }
      }
      processed++;
      if (processed % 25 === 0) console.log(`  [${slug}] ${processed} processed so far...`);
      // A sustained, unthrottled run of this (hundreds of POIs, each with
      // several DB round trips) measurably competes with the live app's own
      // queries against the same small production Postgres instance — this
      // was confirmed the likely cause of a real page failing to load for a
      // real user while an earlier run of this script was going. One
      // connection stays open the whole time either way; this pause exists
      // to cap sustained throughput, not connection count.
      await sleep(400);
    }
  }
  return processed;
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  const destinations = await prisma.destination.findMany({
    where: { status: { not: "draft" } },
    orderBy: { name: "asc" },
    select: { id: true, name: true, slug: true },
  });
  console.log(`Enriching ${destinations.length} destinations...`);

  for (const dest of destinations) {
    const remaining = await prisma.pointOfInterest.count({
      where: { category: { area: { destinationId: dest.id } }, geometryType: "point", enrichedAt: null },
    });
    if (remaining === 0) {
      console.log(`${dest.slug}: already fully enriched, skipping`);
      continue;
    }
    console.log(`=== ${dest.slug} (${dest.name}): ${remaining} POIs to process ===`);
    const started = Date.now();
    const processed = await enrichDestination(dest.id, dest.name, dest.slug);
    console.log(`=== ${dest.slug}: done, processed ${processed} in ${Math.round((Date.now() - started) / 1000)}s ===`);
  }
  console.log("ALL DESTINATIONS DONE");
}

main()
  .catch((e) => {
    console.error("FAILED", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
