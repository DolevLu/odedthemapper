// Japan's new KML export (see scripts/import-japan-2.ts) is a Google Maps
// "saved places" style export: 839 of its 1025 placemarks (82%) carry no
// <name> at all, just gx:mid/gx:fid place references and bare coordinates —
// confirmed directly against the raw file, not a parser bug. Same fix as
// name-unnamed-points.ts (that file is pre-existing/already modified and is
// never touched — see AGENTS notes — so this is a fresh, Japan-scoped copy
// of the same logic rather than editing it): reverse-geocode via
// OpenStreetMap's public Nominatim API (free, no key) so a map pin never
// shows the raw "ללא שם" placeholder. Must run BEFORE enrichment
// (enrich-all-destinations.ts / the admin panel) — the AI enrichment step
// treats "ללא שם" as if it were a real (if odd) place name otherwise.
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient({ datasourceUrl: process.env.POSTGRES_URL_NON_POOLING });

const SLUG = "japan";
const USER_AGENT = "OdedHaMapper/1.0 (travel app POI naming, one-off backfill; contact: dolev0018@gmail.com)";

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
      { headers: { "User-Agent": USER_AGENT }, signal: AbortSignal.timeout(10000) }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const addr = data.address ?? {};
    const specific =
      data.name || addr.attraction || addr.tourism || addr.leisure || addr.amenity || addr.shop || addr.building || addr.office;
    if (specific && typeof specific === "string") return specific;
    const locality = addr.suburb || addr.neighbourhood || addr.city_district || addr.town || addr.village || addr.city;
    if (addr.road && locality) return `${addr.road}, ${locality}`;
    if (addr.road) return String(addr.road);
    if (locality) return String(locality);
    const firstPart = typeof data.display_name === "string" ? data.display_name.split(",")[0].trim() : null;
    return firstPart || null;
  } catch {
    return null;
  }
}

async function withRetry<T>(fn: () => Promise<T>, label: string, attempts = 4): Promise<T> {
  for (let i = 1; i <= attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      if (i === attempts) throw err;
      await new Promise((r) => setTimeout(r, 1500 * i));
      console.log(`  [retry] ${label} (attempt ${i}/${attempts}): ${(err as Error).message}`);
    }
  }
  throw new Error("unreachable");
}

async function main() {
  const dest = await withRetry(() => prisma.destination.findUniqueOrThrow({ where: { slug: SLUG } }), `${SLUG}: lookup`);

  let named = 0;
  let skipped = 0;
  let processed = 0;
  for (;;) {
    const batch = await withRetry(
      () =>
        prisma.pointOfInterest.findMany({
          where: { name: "ללא שם", geometryType: "point", category: { area: { destinationId: dest.id } } },
          select: { id: true, lat: true, lng: true },
          take: 20,
        }),
      `${SLUG}: fetch batch`
    );
    if (batch.length === 0) break;

    for (const poi of batch) {
      const name = await reverseGeocode(poi.lat, poi.lng);
      if (name) {
        await withRetry(() => prisma.pointOfInterest.update({ where: { id: poi.id }, data: { name } }), `${SLUG}: update ${poi.id}`);
        named++;
      } else {
        await withRetry(
          () => prisma.pointOfInterest.update({ where: { id: poi.id }, data: { name: "ללא שם (לא זוהה)" } }),
          `${SLUG}: mark unresolved ${poi.id}`
        );
        skipped++;
      }
      processed++;
      if (processed % 50 === 0) console.log(`  ...${processed} processed so far`);
      await sleep(1100); // Nominatim policy: max ~1 req/sec
    }
  }
  console.log(`DONE — named ${named}, unresolved ${skipped}, total processed ${processed}`);
}

main()
  .catch((e) => {
    console.error("FAILED", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
