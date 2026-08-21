// Runs the same AI enrichment logic as the admin panel's button, but across
// every destination, to completion, in one long-running process — resumable
// by design (enrichedAt marks progress), so re-running after an interruption
// just continues where it left off instead of redoing work.
import { prisma } from "../src/lib/prisma";
import { extractTextDescription } from "../src/lib/data/pois";
import { findWikipediaPhoto, generateDescriptionAndWebsite } from "../src/lib/kml/enrichPoi";

const GENERIC_DESCRIPTION_MARKERS = ["נקודה שסומנה במסלול", "מומלץ לבדוק שעות פתיחה"];
const GENERIC_PHOTO_MIN_REUSE = 4;
const escapeHtml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

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
    const batch = await prisma.pointOfInterest.findMany({
      where: { category: { area: { destinationId } }, geometryType: "point", enrichedAt: null },
      include: { category: { include: { area: true } }, photos: { select: { url: true } } },
      take: 20,
      orderBy: { id: "asc" },
    });
    if (batch.length === 0) break;

    for (const poi of batch) {
      const descriptionText = extractTextDescription(poi.rawDescriptionHtml);
      const needsDescription = !descriptionText || GENERIC_DESCRIPTION_MARKERS.some((m) => descriptionText.includes(m));
      const hasRealPhoto = poi.photos.some((p) => !genericPhotoUrls.has(p.url));
      const needsPhoto = !hasRealPhoto;
      const needsWebsite = !poi.website;

      if (!needsDescription && !needsPhoto && !needsWebsite) {
        await prisma.pointOfInterest.update({ where: { id: poi.id }, data: { enrichedAt: new Date() } });
      } else {
        const photoUrl = needsPhoto ? await findWikipediaPhoto(poi.name, poi.lat, poi.lng) : null;
        const aiResult =
          needsDescription || needsWebsite
            ? await generateDescriptionAndWebsite(poi.name, poi.category.name, poi.category.area.name, destinationName, poi.lat, poi.lng)
            : { description: null, website: null };

        await prisma.pointOfInterest.update({
          where: { id: poi.id },
          data: {
            enrichedAt: new Date(),
            ...(needsWebsite && aiResult.website ? { website: aiResult.website } : {}),
            ...(needsDescription && aiResult.description ? { rawDescriptionHtml: `<p>${escapeHtml(aiResult.description)}</p>` } : {}),
          },
        });
        if (needsPhoto && photoUrl) {
          await prisma.poiPhoto.create({ data: { poiId: poi.id, url: photoUrl } });
        }
      }
      processed++;
      if (processed % 25 === 0) console.log(`  [${slug}] ${processed} processed so far...`);
    }
  }
  return processed;
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
