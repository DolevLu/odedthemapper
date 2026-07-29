import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parseKml } from "../src/lib/kml/parse";

const xml = readFileSync(join(__dirname, "..", "fixtures", "kml", "italy.kml"), "utf-8");
const parsed = parseKml(xml);

let totalPois = 0;
const geometryCounts: Record<string, number> = {};

console.log(`Document: ${parsed.documentName}`);
console.log(`Areas: ${parsed.areas.length}`);

for (const area of parsed.areas) {
  const areaPoiCount = area.categories.reduce((sum, c) => sum + c.pois.length, 0);
  console.log(`  - ${area.name}: ${area.categories.length} categories, ${areaPoiCount} POIs`);
  for (const category of area.categories) {
    console.log(`      · ${category.name} (${category.colorHex}): ${category.pois.length}`);
    for (const poi of category.pois) {
      totalPois += 1;
      geometryCounts[poi.geometryType] = (geometryCounts[poi.geometryType] ?? 0) + 1;
    }
  }
}

console.log(`\nTotal POIs parsed: ${totalPois}`);
console.log("Geometry breakdown:", geometryCounts);
console.log("\nSample POI:", JSON.stringify(parsed.areas[0]?.categories[0]?.pois[0], null, 2));
