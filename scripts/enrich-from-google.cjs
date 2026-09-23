/* Links every curated (KML) point of a destination to its real Google Place and
 * copies over what Google knows: photo, rating, address, phone, website, hours,
 * and the "open in Google Maps" link - so a curated point looks and behaves
 * like one saved straight from Google's own place layer.
 *
 * Updates each point IN PLACE (rather than deleting it and creating a new one)
 * on purpose: category, color, icon, favorites, ratings and itinerary stops all
 * hang off the point's id, so a delete-and-recreate would silently wipe them.
 * The visible result is the same - the point now IS the Google place.
 *
 *   node scripts/enrich-from-google.cjs --slug prague --dry      # report only
 *   node scripts/enrich-from-google.cjs --slug prague            # write
 *
 * Always writes a full backup of the destination's points first
 * (backups/*.json) so the whole thing is reversible.
 */
const fs = require("fs");
const path = require("path");
const { PrismaClient } = require("@prisma/client");

const args = process.argv.slice(2);
const slug = args[args.indexOf("--slug") + 1];
const DRY = args.includes("--dry");
// Appended to each name query to keep a common name ("Central Station") in the right city.
const CITY = args.includes("--city") ? args[args.indexOf("--city") + 1] : "";
const LIMIT = args.includes("--limit") ? Number(args[args.indexOf("--limit") + 1]) : Infinity;
if (!slug) throw new Error("--slug is required");

const env = Object.fromEntries(
  fs.readFileSync(path.join(__dirname, "..", ".env"), "utf8").split(/\r?\n/).filter((l) => /^[A-Z_0-9]+=/.test(l)).map((l) => {
    const i = l.indexOf("=");
    return [l.slice(0, i), l.slice(i + 1).replace(/^"|"$/g, "")];
  })
);
const KEY = env.GOOGLE_MAPS_SERVER_API_KEY || env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
const prisma = new PrismaClient({ datasources: { db: { url: env.POSTGRES_PRISMA_URL + "&connection_limit=4" } } });

const STOP = new Set(["the", "of", "in", "and", "a", "at", "de", "la", "restaurant", "cafe", "bar", "prague", "praha", "praga", "copenhagen", "kobenhavn", "japan", ...CITY.toLowerCase().split(" ")]);
const norm = (s) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9֐-׿]+/g, " ").trim();
const tokens = (s) => norm(s).split(" ").filter((t) => t && !STOP.has(t));
function similarity(a, b) {
  const A = new Set(tokens(a)), B = new Set(tokens(b));
  if (!A.size || !B.size) return 0;
  let common = 0;
  for (const t of A) if (B.has(t) || [...B].some((u) => u.length > 4 && t.length > 4 && (u.startsWith(t) || t.startsWith(u)))) common++;
  // Capped: several of A's tokens can prefix-match one token of B, which used to push this above 1.
  return Math.min(1, common / Math.min(A.size, B.size));
}
function meters(aLat, aLng, bLat, bLng) {
  const R = 6371000, r = (d) => (d * Math.PI) / 180;
  const h = Math.sin(r(bLat - aLat) / 2) ** 2 + Math.cos(r(aLat)) * Math.cos(r(bLat)) * Math.sin(r(bLng - aLng) / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
async function g(url) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(url);
      const body = await res.json();
      if (body.status === "OVER_QUERY_LIMIT") { await new Promise((r) => setTimeout(r, 1500)); continue; }
      return body;
    } catch { await new Promise((r) => setTimeout(r, 800)); }
  }
  return { status: "FETCH_FAILED" };
}
const accept = (sim, dist) => (sim >= 0.6 && dist <= 500) || (sim >= 0.34 && dist <= 120) || (sim >= 0.9 && dist <= 300);

async function findMatch(poi) {
  const cands = [];
  const fp = await g(
    `https://maps.googleapis.com/maps/api/place/findplacefromtext/json?input=${encodeURIComponent((poi.name + " " + CITY).trim())}&inputtype=textquery&locationbias=circle:800@${poi.lat},${poi.lng}&fields=place_id,name,geometry,types&language=en&key=${KEY}`
  );
  cands.push(...(fp.candidates || []));
  let best = pick(cands, poi);
  if (best) return best;
  const ts = await g(
    `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(poi.name)}&location=${poi.lat},${poi.lng}&radius=800&language=en&key=${KEY}`
  );
  return pick(ts.results || [], poi);
}
// Places that are an AREA or a ROAD rather than somewhere you go: a KML pin named after a town, ward or highway
// would otherwise pick up an unrelated shop/office that happens to share the name.
const NOT_A_PLACE = new Set(["locality", "political", "route", "street_address", "neighborhood", "sublocality", "sublocality_level_1", "administrative_area_level_1", "administrative_area_level_2", "administrative_area_level_3", "postal_code", "country"]);
function isAreaOrRoad(types) {
  if (!types || !types.length) return false;
  if (types.includes("point_of_interest") || types.includes("establishment")) return false;
  return types.some((t) => NOT_A_PLACE.has(t));
}
function pick(cands, poi) {
  let best = null;
  for (const c of cands) {
    if (isAreaOrRoad(c.types)) continue;
    const loc = c.geometry && c.geometry.location;
    if (!loc) continue;
    const dist = meters(poi.lat, poi.lng, loc.lat, loc.lng);
    const sim = similarity(poi.name, c.name || "");
    if (!accept(sim, dist)) continue;
    const score = sim * 2 - dist / 1000;
    if (!best || score > best.score) best = { placeId: c.place_id, name: c.name, dist, sim, score };
  }
  return best;
}

(async () => {
  const dest = await prisma.destination.findFirst({ where: { slug }, select: { id: true, name: true } });
  const all = await prisma.pointOfInterest.findMany({
    where: { category: { area: { destinationId: dest.id } } },
    include: { photos: true, category: { select: { name: true } } },
  });
  fs.mkdirSync(path.join(__dirname, "..", "backups"), { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupFile = path.join(__dirname, "..", "backups", `${slug}-pois-before-google-${stamp}.json`);
  fs.writeFileSync(backupFile, JSON.stringify(all, null, 1));
  console.log(`backup: ${all.length} points -> ${backupFile}`);

  const todo = all.filter((p) => p.geometryType === "point" && !p.googlePlaceId).slice(0, LIMIT);
  console.log(`${todo.length} point(s) to process${DRY ? " (DRY RUN - nothing is written)" : ""}`);

  const report = { matched: [], skipped: [] };
  let idx = 0;
  async function worker() {
    while (idx < todo.length) {
      const poi = todo[idx++];
      const match = await findMatch(poi);
      if (!match) { report.skipped.push({ name: poi.name, category: poi.category.name, reason: "no confident match" }); continue; }
      const d = await g(
        `https://maps.googleapis.com/maps/api/place/details/json?place_id=${match.placeId}&fields=name,geometry,formatted_address,formatted_phone_number,international_phone_number,website,url,rating,user_ratings_total,opening_hours,photos,business_status&language=en&key=${KEY}`
      );
      const r = d.result;
      if (!r) { report.skipped.push({ name: poi.name, category: poi.category.name, reason: "details failed: " + d.status }); continue; }
      if (r.business_status === "CLOSED_PERMANENTLY") { report.skipped.push({ name: poi.name, category: poi.category.name, reason: "permanently closed on Google" }); continue; }

      const useGoogleCoords = match.dist <= 250 && r.geometry && r.geometry.location;
      const data = {
        googlePlaceId: match.placeId,
        googlePhotoRef: (r.photos && r.photos[0] && r.photos[0].photo_reference) || null,
        phone: r.formatted_phone_number || r.international_phone_number || null,
        googleUrl: r.url || null,
        googleRating: typeof r.rating === "number" ? r.rating : null,
        googleRatingCount: typeof r.user_ratings_total === "number" ? r.user_ratings_total : null,
        googleHours: r.opening_hours && r.opening_hours.weekday_text ? JSON.stringify(r.opening_hours.weekday_text) : null,
        ...(r.formatted_address ? { address: r.formatted_address } : {}),
        ...(r.website ? { website: r.website } : {}),
        ...(useGoogleCoords ? { lat: r.geometry.location.lat, lng: r.geometry.location.lng } : {}),
      };
      report.matched.push({ name: poi.name, google: r.name, dist: Math.round(match.dist), sim: Number(match.sim.toFixed(2)), photo: !!data.googlePhotoRef, rating: data.googleRating });
      if (DRY) continue;

      await prisma.$transaction(async (tx) => {
        await tx.pointOfInterest.update({ where: { id: poi.id }, data });
        if (data.googlePhotoRef) {
          // Google's photo goes first (photos are read in id order), the old
          // ones follow - except leftover raw Google URLs, which are the very
          // short-lived kind this replaces.
          await tx.poiPhoto.deleteMany({ where: { poiId: poi.id } });
          await tx.poiPhoto.create({ data: { poiId: poi.id, url: `/api/place-photo/${poi.id}` } });
          for (const old of poi.photos) {
            if (old.url.includes("maps.googleapis.com/maps/api/place/js/")) continue;
            await tx.poiPhoto.create({ data: { poiId: poi.id, url: old.url } });
          }
        }
      });
    }
  }
  const ticker = setInterval(() => console.log(`  ...${Math.min(idx, todo.length)}/${todo.length} (matched ${report.matched.length}, skipped ${report.skipped.length})`), 30000);
  await Promise.all([worker(), worker(), worker()]);
  clearInterval(ticker);

  const reportFile = path.join(__dirname, "..", "backups", `${slug}-enrich-report-${DRY ? "dry-" : ""}${stamp}.json`);
  fs.writeFileSync(reportFile, JSON.stringify(report, null, 1));
  console.log(`matched ${report.matched.length}, skipped ${report.skipped.length} -> ${reportFile}`);
  await prisma.$disconnect();
})();
