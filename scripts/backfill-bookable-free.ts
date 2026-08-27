// Zero-cost fallback for scripts/backfill-bookable.ts — that one needs
// Gemini, which hit the API key's free-tier daily cap (20 requests/day,
// confirmed live) partway through the original run. Most destinations here
// lump everything into a single generic "אטרקציות כללי"/"כללי" category (no
// fine-grained category signal to filter on), so this matches by NAME
// instead — landmark-style keywords (Tower/Palace/Castle/Museum/Cruise/
// Tour/Temple/Wat/Cathedral/...) that reliably signal a ticketed or
// reservation-worthy place regardless of which bucket it got filed under —
// plus up to 2 well-photographed restaurants, matching the pattern
// Prague's own hand-set 5 bookable items already show (a tower, a unique
// paid experience, 2 restaurants, a cafe).
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient({ datasourceUrl: process.env.POSTGRES_URL_NON_POOLING });

const MIN_TARGET = 4;
const LANDMARK_NAME_MATCH =
  /\btower|palace|castle|museum|cruise|boat tour|guided tour|temple|\bwat\b|pagoda|cathedral|basilica|gondola|cable car|aquarium|\bzoo\b|theme park|water park|\bspa\b|\bopera|\bshow\b|planetarium|observatory|fortress|citadel/i;
const FOOD_CATEGORY_MATCH = /מסעד|קפה|בראנץ/;
// Same "personal KML notes, not real venue names" placeholders enrichPoi.ts
// already guards against — never worth surfacing as a real recommendation.
const PLACEHOLDER_NAME = /^ללא שם$|נקודה שמורה \d+/;

async function withRetry<T>(fn: () => Promise<T>, label: string, attempts = 4): Promise<T> {
  for (let i = 1; i <= attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      if (i === attempts) throw err;
      const delayMs = 1500 * i;
      console.log(`  [retry] ${label} (attempt ${i}/${attempts}): ${(err as Error).message}`);
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
  throw new Error("unreachable");
}

async function main() {
  const destinations = await withRetry(
    () => prisma.destination.findMany({ where: { status: { not: "draft" } }, select: { id: true, name: true, slug: true } }),
    "list destinations"
  );

  for (const dest of destinations) {
    const existing = await withRetry(
      () => prisma.pointOfInterest.count({ where: { wantsBooking: true, category: { area: { destinationId: dest.id } } } }),
      `${dest.slug}: count existing`
    );
    if (existing >= MIN_TARGET) {
      console.log(`${dest.slug}: already has ${existing}, skipping`);
      continue;
    }

    const allCandidates = await withRetry(
      () =>
        prisma.pointOfInterest.findMany({
          where: { geometryType: "point", wantsBooking: false, category: { area: { destinationId: dest.id } } },
          select: { id: true, name: true, isMustSee: true, category: { select: { name: true } }, photos: { take: 1, select: { id: true } } },
        }),
      `${dest.slug}: fetch candidates`
    );
    const candidates = allCandidates.filter((c) => !PLACEHOLDER_NAME.test(c.name));

    let landmarks = candidates
      .filter((c) => LANDMARK_NAME_MATCH.test(c.name) && !FOOD_CATEGORY_MATCH.test(c.category.name))
      .sort((a, b) => Number(b.isMustSee) - Number(a.isMustSee) || Number(b.photos.length > 0) - Number(a.photos.length > 0))
      .slice(0, 4);

    // Landmark-name matching came up short (generic category buckets with no
    // obviously "ticketed" naming pattern) — fall back to whatever's already
    // flagged as one of the destination's unmissable highlights, which is a
    // reasonable proxy for "worth booking ahead" on its own.
    if (landmarks.length < 3) {
      const usedIds = new Set(landmarks.map((l) => l.id));
      const fallback = candidates
        .filter((c) => c.isMustSee && !FOOD_CATEGORY_MATCH.test(c.category.name) && !usedIds.has(c.id))
        .slice(0, 4 - landmarks.length);
      landmarks = [...landmarks, ...fallback];
    }

    // Still nothing — last resort: top well-photographed general attractions
    // regardless of naming pattern or must-see flag. A real photo is at
    // least a mild quality signal (someone bothered to verify one), and
    // something reasonable beats an empty screen.
    if (landmarks.length === 0) {
      landmarks = candidates
        .filter((c) => !FOOD_CATEGORY_MATCH.test(c.category.name) && c.photos.length > 0)
        .sort((a, b) => Number(b.isMustSee) - Number(a.isMustSee))
        .slice(0, 3);
    }

    const restaurants = candidates
      .filter((c) => FOOD_CATEGORY_MATCH.test(c.category.name) && c.photos.length > 0)
      .slice(0, 2 - Math.max(0, landmarks.length - 3)); // keep total roughly 4-6

    const picked = [...landmarks, ...restaurants];
    if (picked.length === 0) {
      console.log(`${dest.slug}: no name-matched candidates found`);
      continue;
    }

    await withRetry(
      () =>
        prisma.pointOfInterest.updateMany({
          where: { id: { in: picked.map((p) => p.id) } },
          data: { wantsBooking: true },
        }),
      `${dest.slug}: flag bookable`
    );
    console.log(`${dest.slug}: flagged ${picked.length} — ${picked.map((p) => p.name).join(", ")}`);
  }
  console.log("DONE");
}

main()
  .catch((e) => {
    console.error("FAILED", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
