/** Parsing for a Google Maps saved list exported by the user themselves
 * (Google Takeout: "Saved" lists as CSV, "Saved Places.json" as GeoJSON).
 * Runs in the browser - the file never has to be uploaded just to be read. */

export type ListItem = {
  title: string;
  note: string | null;
  url: string | null;
  lat: number | null;
  lng: number | null;
};

/** Minimal RFC 4180 CSV parser: quoted fields, doubled quotes, newlines inside
 * quotes. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  const src = text.replace(/^﻿/, "");
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (inQuotes) {
      if (c === '"' && src[i + 1] === '"') {
        field += '"';
        i++;
      } else if (c === '"') inQuotes = false;
      else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && src[i + 1] === "\n") i++;
      row.push(field);
      field = "";
      if (row.some((x) => x.trim() !== "")) rows.push(row);
      row = [];
    } else field += c;
  }
  row.push(field);
  if (row.some((x) => x.trim() !== "")) rows.push(row);
  return rows;
}

/** Google Maps place links sometimes carry coordinates: "@lat,lng" or
 * "!3dLAT!4dLNG". Returns null when the link has none (most Takeout links). */
export function coordsFromMapsUrl(url: string): { lat: number; lng: number } | null {
  const a = url.match(/!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/);
  const b = url.match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/);
  const m = a ?? b;
  if (!m) return null;
  const lat = Number(m[1]);
  const lng = Number(m[2]);
  return Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180 ? { lat, lng } : null;
}

const isRealCoord = (lat: number, lng: number) =>
  Number.isFinite(lat) && Number.isFinite(lng) && !(lat === 0 && lng === 0) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;

function fromCsv(text: string): ListItem[] {
  const rows = parseCsv(text);
  if (rows.length < 2) return [];
  const header = rows[0].map((h) => h.trim().toLowerCase());
  const col = (...names: string[]) => header.findIndex((h) => names.includes(h));
  const iTitle = col("title", "name", "שם");
  const iNote = col("note", "comment", "הערה", "notes");
  const iUrl = col("url", "link", "google maps url");
  if (iTitle === -1) return [];
  const items: ListItem[] = [];
  for (const r of rows.slice(1)) {
    const title = (r[iTitle] ?? "").trim();
    if (!title) continue;
    const url = iUrl !== -1 ? (r[iUrl] ?? "").trim() || null : null;
    const c = url ? coordsFromMapsUrl(url) : null;
    items.push({ title, note: iNote !== -1 ? (r[iNote] ?? "").trim() || null : null, url, lat: c?.lat ?? null, lng: c?.lng ?? null });
  }
  return items;
}

type GeoFeature = {
  geometry?: { coordinates?: number[] };
  properties?: Record<string, unknown>;
};

function fromGeoJson(text: string): ListItem[] {
  let data: { features?: GeoFeature[] };
  try {
    data = JSON.parse(text);
  } catch {
    return [];
  }
  const items: ListItem[] = [];
  for (const f of data.features ?? []) {
    const p = f.properties ?? {};
    const loc = (p["Location"] ?? {}) as Record<string, unknown>;
    const title = String(p["Title"] ?? p["title"] ?? p["name"] ?? loc["Business Name"] ?? "").trim();
    if (!title) continue;
    const url = String(p["Google Maps URL"] ?? p["google_maps_url"] ?? p["url"] ?? "").trim() || null;
    const [lng, lat] = f.geometry?.coordinates ?? [];
    const fromUrl = url ? coordsFromMapsUrl(url) : null;
    const coords = isRealCoord(lat, lng) ? { lat, lng } : fromUrl;
    const note = String(p["Comment"] ?? p["Note"] ?? "").trim() || null;
    items.push({ title, note, url, lat: coords?.lat ?? null, lng: coords?.lng ?? null });
  }
  return items;
}

export function parseGoogleList(text: string, filename: string): ListItem[] {
  const trimmed = text.trimStart();
  const isJson = filename.toLowerCase().endsWith("json") || trimmed.startsWith("{");
  const items = isJson ? fromGeoJson(text) : fromCsv(text);
  // The same place listed twice in one export - keep the first.
  const seen = new Set<string>();
  return items.filter((i) => {
    const key = `${i.title.toLowerCase()}|${i.lat ?? ""}|${i.lng ?? ""}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
