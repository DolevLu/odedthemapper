/* Undoes the Google links from scripts/enrich-from-google.cjs that turned out
 * too loose: a linked place whose real location is more than --max-dist metres
 * from where the curated point originally sat. Those are mostly a town or a
 * generic "Train Station" pin that picked up a same-named stop or harbour a
 * few hundred metres away - the wrong photo/rating for that pin.
 *
 * Restores each such point (fields, position and photos) from the backup the
 * enrichment run wrote, so it is exactly what it was before.
 *
 *   node scripts/revert-far-google-links.cjs --slug copenhagen \
 *        --backup backups/copenhagen-pois-before-google-<stamp>.json [--max-dist 300] [--dry]
 */
const fs = require("fs");
const path = require("path");
const { PrismaClient } = require("@prisma/client");

const args = process.argv.slice(2);
const arg = (n, d) => (args.includes(n) ? args[args.indexOf(n) + 1] : d);
const slug = arg("--slug");
const backupFile = arg("--backup");
const MAX = Number(arg("--max-dist", "300"));
const DRY = args.includes("--dry");
if (!slug || !backupFile) throw new Error("--slug and --backup are required");

const env = Object.fromEntries(
  fs.readFileSync(path.join(__dirname, "..", ".env"), "utf8").split(/\r?\n/).filter((l) => /^[A-Z_0-9]+=/.test(l)).map((l) => {
    const i = l.indexOf("=");
    return [l.slice(0, i), l.slice(i + 1).replace(/^"|"$/g, "")];
  })
);
const KEY = env.GOOGLE_MAPS_SERVER_API_KEY || env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
const prisma = new PrismaClient({ datasources: { db: { url: env.POSTGRES_PRISMA_URL + "&connection_limit=4" } } });

function meters(aLat, aLng, bLat, bLng) {
  const R = 6371000, r = (d) => (d * Math.PI) / 180;
  const h = Math.sin(r(bLat - aLat) / 2) ** 2 + Math.cos(r(aLat)) * Math.cos(r(bLat)) * Math.sin(r(bLng - aLng) / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

(async () => {
  const before = JSON.parse(fs.readFileSync(backupFile, "utf8"));
  const orig = new Map(before.map((p) => [p.id, p]));
  const dest = await prisma.destination.findFirst({ where: { slug }, select: { id: true } });
  const linked = await prisma.pointOfInterest.findMany({
    where: { category: { area: { destinationId: dest.id } }, googlePlaceId: { not: null } },
    select: { id: true, name: true, googlePlaceId: true },
  });
  console.log(`${linked.length} linked point(s) to check against ${MAX}m`);

  const toRevert = [];
  let idx = 0;
  async function worker() {
    while (idx < linked.length) {
      const p = linked[idx++];
      const o = orig.get(p.id);
      if (!o) continue;
      let loc = null;
      for (let a = 0; a < 3 && !loc; a++) {
        try {
          const res = await fetch(`https://maps.googleapis.com/maps/api/place/details/json?place_id=${p.googlePlaceId}&fields=geometry&key=${KEY}`);
          loc = ((await res.json()).result || {}).geometry?.location || null;
        } catch { await new Promise((r) => setTimeout(r, 500)); }
      }
      if (!loc) continue;
      const d = meters(o.lat, o.lng, loc.lat, loc.lng);
      if (d > MAX) toRevert.push({ id: p.id, name: p.name, dist: Math.round(d) });
    }
  }
  await Promise.all([worker(), worker(), worker(), worker()]);

  toRevert.sort((a, b) => b.dist - a.dist);
  toRevert.forEach((r) => console.log(`  ${DRY ? "would revert" : "reverting"} ${r.name} (${r.dist}m)`));
  if (!DRY) {
    for (const r of toRevert) {
      const o = orig.get(r.id);
      await prisma.$transaction(async (tx) => {
        await tx.pointOfInterest.update({
          where: { id: r.id },
          data: {
            googlePlaceId: null, googlePhotoRef: null, phone: null, googleUrl: null, googleRating: null, googleRatingCount: null, googleHours: null,
            address: o.address, website: o.website, lat: o.lat, lng: o.lng,
          },
        });
        await tx.poiPhoto.deleteMany({ where: { poiId: r.id } });
        for (const ph of o.photos) await tx.poiPhoto.create({ data: { poiId: r.id, url: ph.url } });
      });
    }
  }
  console.log(`${DRY ? "would revert" : "reverted"} ${toRevert.length} of ${linked.length}`);
  await prisma.$disconnect();
})();
