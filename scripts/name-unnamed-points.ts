// Discovered while trying to backfill bookable items: several destinations
// have the vast majority of their points completely unnamed in the source
// KML (bare lat/lng, no <name>, no description — confirmed by checking the
// raw rows directly, not a parser bug: cambodia 99%, dubai 99%, laos 98%,
// tanzania 97% unnamed). A paying customer tapping most pins on the map
// sees a popup literally titled "ללא שם". Free fix: reverse-geocode via
// OpenStreetMap's public Nominatim API (no key, no cost) to give each point
// a real name/address instead.
//
// Deliberately conservative about Nominatim's usage policy (max ~1 req/sec,
// explicitly discourages heavy bulk geocoding on the shared public
// instance): only the worst-affected destinations, a real User-Agent, and a
// hard cap per run — this is meant to be re-run across a few sessions, not
// hammer their free server in one go.
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient({ datasourceUrl: process.env.POSTGRES_URL_NON_POOLING });

const TARGET_SLUGS = ["cambodia", "dubai", "laos", "tanzania"];
const MAX_PER_RUN = 700;
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
  let processed = 0;
  for (const slug of TARGET_SLUGS) {
    if (processed >= MAX_PER_RUN) break;
    const dest = await withRetry(() => prisma.destination.findUnique({ where: { slug } }), `${slug}: lookup`);
    if (!dest) continue;

    let named = 0;
    let skipped = 0;
    for (;;) {
      if (processed >= MAX_PER_RUN) break;
      const batch = await withRetry(
        () =>
          prisma.pointOfInterest.findMany({
            where: { name: "ללא שם", geometryType: "point", category: { area: { destinationId: dest.id } } },
            select: { id: true, lat: true, lng: true },
            take: 20,
          }),
        `${slug}: fetch batch`
      );
      if (batch.length === 0) break;

      for (const poi of batch) {
        if (processed >= MAX_PER_RUN) break;
        const name = await reverseGeocode(poi.lat, poi.lng);
        if (name) {
          await withRetry(() => prisma.pointOfInterest.update({ where: { id: poi.id }, data: { name } }), `${slug}: update ${poi.id}`);
          named++;
        } else {
          // Mark it distinctly so this run doesn't loop on the same
          // unresolvable point forever — a future pass can retry these.
          await withRetry(
            () => prisma.pointOfInterest.update({ where: { id: poi.id }, data: { name: "ללא שם (לא זוהה)" } }),
            `${slug}: mark unresolved ${poi.id}`
          );
          skipped++;
        }
        processed++;
        if (processed % 50 === 0) console.log(`  ...${processed} processed so far`);
        await sleep(1100); // Nominatim policy: max ~1 req/sec
      }
    }
    console.log(`${slug}: named ${named}, unresolved ${skipped}`);
  }
  console.log(`DONE — processed ${processed} total`);
}

main()
  .catch((e) => {
    console.error("FAILED", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
