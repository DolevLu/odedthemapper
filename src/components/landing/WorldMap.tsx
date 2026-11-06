import fs from "node:fs";
import path from "node:path";

// Countries (ISO-A2) that have a destination in the app. France/Norway/Malta/Singapore aren't polygons in the 110m
// dataset, so they get a dot marker instead.
const AVAILABLE = new Set(["AT", "IT", "GB", "AR", "HU", "AE", "NL", "CN", "PH", "VN", "TZ", "GR", "JP", "LA", "LT", "PL", "PT", "CZ", "DK", "KR", "KH", "CY", "HR", "RO", "SE", "CH", "TH", "ES"]);
const DOTS: [number, number][] = [
  [2.3, 46.6], // France
  [9, 61], // Norway
  [14.4, 35.9], // Malta
  [103.8, 1.35], // Singapore
];
const W = 1000;
const H = 480;
const proj = (lon: number, lat: number): [number, number] => [((lon + 180) / 360) * W, ((84 - lat) / 150) * H];

type Geo = { features: { properties: { iso_a2?: string }; geometry: { type: string; coordinates: number[][][] | number[][][][] } }[] };
let cached: { base: string; hit: string } | null = null;

function ring(r: number[][]): string {
  return r.map((p, i) => { const [x, y] = proj(p[0], p[1]); return `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`; }).join("") + "Z";
}
function build() {
  if (cached) return cached;
  const g = JSON.parse(fs.readFileSync(path.join(process.cwd(), "public", "data", "world-countries.geojson"), "utf8")) as Geo;
  let base = "";
  let hit = "";
  for (const f of g.features) {
    const polys = f.geometry.type === "Polygon" ? [f.geometry.coordinates as number[][][]] : (f.geometry.coordinates as number[][][][]);
    const d = polys.map((p) => p.map(ring).join("")).join("");
    if (AVAILABLE.has(f.properties.iso_a2 ?? "")) hit += d;
    else base += d;
  }
  cached = { base, hit };
  return cached;
}

/** A light, server-rendered world map with the available countries highlighted (no map SDK, no client JS). */
export function WorldMap() {
  const { base, hit } = build();
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="World map">
      <path d={base} fill="#E5E5E5" stroke="#fff" strokeWidth="0.6" />
      <path d={hit} fill="#6D28D9" stroke="#fff" strokeWidth="0.6" />
      {DOTS.map(([lon, lat], i) => {
        const [x, y] = proj(lon, lat);
        return <circle key={i} cx={x} cy={y} r="5" fill="#7C3AED" stroke="#fff" strokeWidth="1.5" />;
      })}
    </svg>
  );
}
