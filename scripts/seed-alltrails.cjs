/* Adds a "טרקים מומלצים" (recommended trails) category to every destination's map, filled from AllTrails data
 * in scripts/alltrails-data/*.json.
 *
 * Where the data came from: the AllTrails connector's find_trails_near_location. It returns stats + a link per trail
 * but NO coordinates, so each trailhead was located by trilateration (distances from 2-3 known query points -
 * verified against known landmarks to ~40 m) or, for the "04-spots" file, by querying a tiny radius around a famous
 * trailhead (the pin sits at that query point, accepted only when AllTrails reported the real start within ~2.5 km).
 * Pins mark where the trail STARTS; the route line itself isn't available from that connector, so each pin links
 * out to the trail's AllTrails page for the full map.
 *
 * Each trail becomes a normal PointOfInterest (so favorites, itinerary stops, ratings, the category filter pills and
 * offline save all just work) in the destination's nearest Area, under a "טרקים מומלצים" Category.
 *
 *   node scripts/seed-alltrails.cjs --dry       # report only
 *   node scripts/seed-alltrails.cjs             # write (safe to re-run: matches existing rows by AllTrails URL)
 *   node scripts/seed-alltrails.cjs --only prague   # just one destination
 *   node scripts/seed-alltrails.cjs --remove    # delete every "טרקים מומלצים" category (and its trails) again
 */
const fs = require("fs");
const path = require("path");
const { PrismaClient } = require("@prisma/client");

const DRY = process.argv.includes("--dry");
const REMOVE = process.argv.includes("--remove");
const ONLY = process.argv.includes("--only") ? process.argv[process.argv.indexOf("--only") + 1] : null;
const CATEGORY_NAME = "טרקים מומלצים";
const CATEGORY_COLOR = "#0F766E";
const PHOTO_KEY = "3p0t5s6b5g4g0e8k3c1j3w7y5c3m4t8i"; // the public widget key AllTrails's own API returns inside every photo URL

const DIFF = { Easy: "קל", Moderate: "בינוני", Hard: "קשה", Strenuous: "מאתגר" };
const ROUTE = { Loop: "מסלול מעגלי", "Out & back": "הלוך ושוב", "Point to point": "מנקודה לנקודה" };

function haversineKm(aLat, aLng, bLat, bLng) {
  const R = 6371;
  const rad = (x) => (x * Math.PI) / 180;
  const h = Math.sin(rad(bLat - aLat) / 2) ** 2 + Math.cos(rad(aLat)) * Math.cos(rad(bLat)) * Math.sin(rad(bLng - aLng) / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function duration(min) {
  if (!min) return null;
  if (min < 60) return `${min} דק׳`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h} שע׳ ו-${m} דק׳` : `${h} שע׳`;
}

function describe(t) {
  const km = (t.l / 1000).toFixed(1).replace(/\.0$/, "");
  const parts = [
    `🥾 ${ROUTE[t.rt] ?? t.rt}`,
    `${km} ק״מ`,
    duration(t.m),
    `קושי ${DIFF[t.df] ?? t.df}`,
    t.g ? `עלייה ${t.g} מ׳` : null,
    `⭐ ${t.r} ב-AllTrails`,
  ].filter(Boolean);
  return parts.join(" · ");
}

function loadTrails() {
  const dir = path.join(__dirname, "alltrails-data");
  const byId = new Map();
  for (const f of fs.readdirSync(dir).filter((f) => f.endsWith(".json")).sort()) {
    for (const t of JSON.parse(fs.readFileSync(path.join(dir, f), "utf8"))) byId.set(t.id, t);
  }
  return [...byId.values()];
}

async function main() {
  const prisma = new PrismaClient();
  try {
    if (REMOVE) {
      const cats = await prisma.category.findMany({ where: { name: CATEGORY_NAME }, select: { id: true } });
      console.log(`${DRY ? "[dry] would delete" : "deleting"} ${cats.length} "${CATEGORY_NAME}" categories (and their trails)`);
      if (!DRY) await prisma.category.deleteMany({ where: { name: CATEGORY_NAME } });
      return;
    }

    const trails = loadTrails();
    const slugs = [...new Set(trails.map((t) => t.d))].filter((s) => !ONLY || s === ONLY);
    let created = 0, updated = 0, skipped = 0;

    for (const slug of slugs) {
      const dest = await prisma.destination.findUnique({
        where: { slug },
        select: {
          id: true,
          areas: { select: { id: true, name: true, categories: { select: { id: true, name: true, pois: { where: { geometryType: "point" }, select: { lat: true, lng: true } } } } } },
        },
      });
      if (!dest || dest.areas.length === 0) {
        console.log(`! ${slug}: no destination/areas - skipped`);
        skipped += trails.filter((t) => t.d === slug).length;
        continue;
      }

      // Each area's centroid, from its own points - the trail goes into whichever area is closest.
      const areaCentroids = dest.areas.map((a) => {
        const pts = a.categories.flatMap((c) => c.pois);
        return pts.length
          ? { area: a, lat: pts.reduce((s, p) => s + p.lat, 0) / pts.length, lng: pts.reduce((s, p) => s + p.lng, 0) / pts.length }
          : { area: a, lat: null, lng: null };
      });

      for (const t of trails.filter((x) => x.d === slug)) {
        let best = areaCentroids[0];
        let bestKm = Infinity;
        for (const ac of areaCentroids) {
          if (ac.lat == null) continue;
          const km = haversineKm(t.lat, t.lng, ac.lat, ac.lng);
          if (km < bestKm) { bestKm = km; best = ac; }
        }
        const area = best.area;
        const url = `https://www.alltrails.com/${t.s}`;
        const data = {
          name: t.n,
          lat: t.lat,
          lng: t.lng,
          geometryType: "point",
          rawDescriptionHtml: describe(t),
          website: url,
          enrichedAt: new Date(), // keeps the AI/Google enrichment scripts from rewriting these
        };

        if (DRY) {
          console.log(`[dry] ${slug} -> ${area.name}: ${t.n} (${t.lat},${t.lng})`);
          created++;
          continue;
        }

        let category = area.categories.find((c) => c.name === CATEGORY_NAME);
        if (!category) {
          category = await prisma.category.create({ data: { areaId: area.id, name: CATEGORY_NAME, colorHex: CATEGORY_COLOR, iconKey: "pin" }, select: { id: true, name: true, pois: true } });
          area.categories.push(category);
        }
        const existing = await prisma.pointOfInterest.findFirst({ where: { categoryId: category.id, website: url }, select: { id: true } });
        const tags = [`קושי ${DIFF[t.df] ?? t.df}`, ROUTE[t.rt] ?? t.rt, "AllTrails"];
        const photoUrl = `https://www.alltrails.com/api/alltrails/trails/${t.id}/profile_photo?size=medium&show_watermark=true&key=${PHOTO_KEY}`;
        if (existing) {
          await prisma.pointOfInterest.update({ where: { id: existing.id }, data });
          updated++;
        } else {
          await prisma.pointOfInterest.create({
            data: { ...data, categoryId: category.id, tags: { create: tags.map((label) => ({ label })) }, photos: { create: [{ url: photoUrl }] } },
          });
          created++;
        }
      }
      console.log(`✓ ${slug}: ${trails.filter((t) => t.d === slug).length} trails`);
    }
    console.log(`\n${DRY ? "[dry] " : ""}created ${created}, updated ${updated}, skipped ${skipped}`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
