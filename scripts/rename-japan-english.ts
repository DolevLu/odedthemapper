// Follow-up to name-unnamed-japan.ts: that pass reverse-geocoded Japan's 839
// nameless placemarks via Nominatim without an explicit language, so most
// came back in raw Japanese script (Kanji/Kana) — useless labels for this
// app's Hebrew-speaking users. Re-does the same 772 POIs (detected by
// containing CJK characters, not by re-tracking which ones were touched)
// with accept-language=en, plus a fallback chain that refuses to settle for
// a still-Japanese result: specific name -> road(+locality) -> locality ->
// city/province -> the POI's own Area name (Hokkaido/Tokyo/... are already
// plain English) as the absolute last resort, so nothing ever lands back in
// Kanji.
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient({ datasourceUrl: process.env.POSTGRES_URL_NON_POOLING });

const SLUG = "japan";
const USER_AGENT = "OdedHaMapper/1.0 (travel app POI naming, one-off backfill; contact: dolev0018@gmail.com)";
const CJK_RE = /[぀-ヿ㐀-鿿豈-﫿]/;

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function clean(s: unknown): string | null {
  return typeof s === "string" && s.trim() && !CJK_RE.test(s) ? s.trim() : null;
}

async function reverseGeocodeEnglish(lat: number, lng: number): Promise<string | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1&accept-language=en`,
      { headers: { "User-Agent": USER_AGENT }, signal: AbortSignal.timeout(10000) }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const addr = data.address ?? {};

    const specific = clean(
      data.name || addr.attraction || addr.tourism || addr.leisure || addr.amenity || addr.shop || addr.building || addr.office
    );
    if (specific) return specific;

    const locality = clean(addr.suburb || addr.neighbourhood || addr.city_district || addr.town || addr.village || addr.city);
    const road = clean(addr.road);
    if (road && locality) return `${road}, ${locality}`;
    if (road) return road;
    if (locality) return locality;

    const broader = clean(addr.city || addr.town || addr.province);
    if (broader) return broader;

    const firstPart = typeof data.display_name === "string" ? data.display_name.split(",")[0].trim() : null;
    return clean(firstPart);
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

  let fixed = 0;
  let fellBackToArea = 0;
  let processed = 0;
  for (;;) {
    const batch = await withRetry(
      () =>
        prisma.pointOfInterest.findMany({
          where: { geometryType: "point", category: { area: { destinationId: dest.id } } },
          select: { id: true, name: true, lat: true, lng: true, category: { select: { area: { select: { name: true } } } } },
          take: 20,
          skip: processed,
          orderBy: { id: "asc" },
        }),
      `${SLUG}: fetch batch`
    );
    if (batch.length === 0) break;

    const cjkBatch = batch.filter((p) => CJK_RE.test(p.name));
    for (const poi of cjkBatch) {
      const name = await reverseGeocodeEnglish(poi.lat, poi.lng);
      const finalName = name ?? poi.category.area.name;
      if (!name) fellBackToArea++;
      await withRetry(() => prisma.pointOfInterest.update({ where: { id: poi.id }, data: { name: finalName } }), `${SLUG}: update ${poi.id}`);
      fixed++;
      await sleep(1100); // Nominatim policy: max ~1 req/sec
    }

    processed += batch.length;
    if (processed % 100 < 20) console.log(`  ...${processed} scanned, ${fixed} renamed so far`);
  }
  console.log(`DONE — renamed ${fixed} (of which ${fellBackToArea} fell back to area name), scanned ${processed} total`);
}

main()
  .catch((e) => {
    console.error("FAILED", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
