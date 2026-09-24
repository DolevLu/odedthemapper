/* Undoes the doubtful "place under the pin" links of one enrichment run.
 *
 * The beneath fallback is trustworthy for a pin that carries no name of its own (the auto-generated
 * "<category> - נקודה שמורה N" pins, dropped by clicking a place on the map), but for a pin that HAS a real name
 * that Google did not recognise it usually picks the wrong neighbour. This restores those from the run's own
 * pre-run backup (fields, position, photos), keeping the placeholder-name links.
 *
 *   node scripts/revert-beneath-links.cjs --report backups/<slug>-enrich-report-<stamp>.json \
 *        --backup backups/<slug>-pois-before-google-<stamp>.json [--dry]
 */
const fs = require("fs");
const path = require("path");
const { PrismaClient } = require("@prisma/client");

const args = process.argv.slice(2);
const arg = (n) => (args.includes(n) ? args[args.indexOf(n) + 1] : undefined);
const DRY = args.includes("--dry");
if (!arg("--report") || !arg("--backup")) throw new Error("--report and --backup are required");

const env = Object.fromEntries(
  fs.readFileSync(path.join(__dirname, "..", ".env"), "utf8").split(/\r?\n/).filter((l) => /^[A-Z_0-9]+=/.test(l)).map((l) => {
    const i = l.indexOf("=");
    return [l.slice(0, i), l.slice(i + 1).replace(/^"|"$/g, "")];
  })
);
const prisma = new PrismaClient({ datasources: { db: { url: env.POSTGRES_PRISMA_URL + "&connection_limit=3" } } });

(async () => {
  const report = JSON.parse(fs.readFileSync(arg("--report"), "utf8"));
  const orig = new Map(JSON.parse(fs.readFileSync(arg("--backup"), "utf8")).map((p) => [p.id, p]));
  const doubtful = report.matched.filter((m) => m.beneath && !/נקודה שמורה/.test(m.name));
  for (const m of doubtful) {
    const o = orig.get(m.id);
    if (!o) continue;
    console.log(`${DRY ? "would revert" : "reverting"} ${m.name} (was linked to ${m.google})`);
    if (DRY) continue;
    await prisma.$transaction(async (tx) => {
      await tx.pointOfInterest.update({
        where: { id: m.id },
        data: {
          name: o.name, googlePlaceId: null, googlePhotoRef: null, phone: null, googleUrl: null, googleRating: null, googleRatingCount: null, googleHours: null,
          address: o.address, website: o.website, lat: o.lat, lng: o.lng,
        },
      });
      await tx.poiPhoto.deleteMany({ where: { poiId: m.id } });
      for (const ph of o.photos) await tx.poiPhoto.create({ data: { poiId: m.id, url: ph.url } });
    });
  }
  console.log(`${DRY ? "would revert" : "reverted"} ${doubtful.length} doubtful link(s), kept ${report.matched.filter((m) => m.beneath).length - doubtful.length} placeholder-name link(s)`);
  await prisma.$disconnect();
})();
