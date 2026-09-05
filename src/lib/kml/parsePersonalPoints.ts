// Parses a traveler's OWN uploaded KML/KMZ (e.g. exported from Google My
// Maps or Google Maps' "your places" lists) into personal map points — kept
// deliberately separate from parse.ts's parseKml, which expects (and
// requires, to produce any output at all) our own admin-curated
// Area-folder > Category-folder > Placemark shape. A personal export is far
// less predictable: often a single flat list of Placemarks with no folders
// at all, or one folder per My Maps "layer" with no further nesting — so
// this walks every <Placemark> in the document directly (regardless of
// nesting depth) instead of requiring a specific folder structure.
import { DOMParser } from "@xmldom/xmldom";
import JSZip from "jszip";
import { el, text, parseCoordinateBlock, buildStyleColorMap } from "./parse";
import { categoryOptionForName } from "@/lib/mapStyles";

export type ParsedPersonalPoint = {
  name: string;
  lat: number;
  lng: number;
  description: string | null;
  categoryName: string;
};

/** Walks up from a Placemark to the nearest enclosing <Folder>'s <name> —
 * that's the closest thing a My Maps export has to a per-point category
 * (one folder per "layer" the user created). */
function nearestFolderName(node: Element): string | null {
  let current = node.parentNode;
  while (current) {
    if (current.nodeType === 1 && (current as unknown as Element).tagName === "Folder") {
      return text(el(current as unknown as Element, "name"));
    }
    current = current.parentNode;
  }
  return null;
}

export function parsePersonalPointsFromKml(xml: string): ParsedPersonalPoint[] {
  const doc = new DOMParser().parseFromString(xml, "text/xml");
  const documentEl = doc.getElementsByTagName("Document")[0] as unknown as Element;
  const root = (documentEl ?? doc.documentElement) as Element;
  // Not currently used for personal points (SavedMapPin has no colorHex
  // field of its own — its icon color comes from categoryName instead), but
  // built for parity with parseKml in case a future version wants it.
  void buildStyleColorMap(root);

  const points: ParsedPersonalPoint[] = [];
  const placemarks = Array.from(root.getElementsByTagName("Placemark")) as unknown as Element[];

  for (const node of placemarks) {
    // Personal pins are point-only — SavedMapPin has no geometry-shape
    // support, so a line/polygon/multi-geometry placemark is silently
    // skipped rather than approximated.
    const point = el(node, "Point");
    if (!point) continue;
    const coordsText = text(el(point, "coordinates"));
    if (!coordsText) continue;
    const [[lng, lat]] = parseCoordinateBlock(coordsText);
    if (lat === undefined || lng === undefined || Number.isNaN(lat) || Number.isNaN(lng)) continue;

    const name = text(el(node, "name")) || "נקודה אישית";
    const descNode = el(node, "description");
    const description = descNode ? descNode.textContent?.trim() || null : null;

    const folderName = nearestFolderName(node);
    const categoryName = categoryOptionForName(folderName ?? name);

    points.push({ name, lat, lng, description, categoryName });
  }

  return points;
}

/** Accepts either a plain .kml (UTF-8 XML) or a .kmz (a zip with one .kml
 * inside, optionally alongside images/other assets we don't need) and
 * returns the parsed personal points either way. */
export async function parsePersonalMapFile(file: File): Promise<ParsedPersonalPoint[]> {
  const isKmz = file.name.toLowerCase().endsWith(".kmz") || file.type === "application/vnd.google-earth.kmz";

  if (!isKmz) {
    return parsePersonalPointsFromKml(await file.text());
  }

  const zip = await JSZip.loadAsync(Buffer.from(await file.arrayBuffer()));
  const kmlEntry = Object.values(zip.files).find((f) => !f.dir && f.name.toLowerCase().endsWith(".kml"));
  if (!kmlEntry) throw new Error("קובץ ה-KMZ שהועלה לא מכיל קובץ KML בפנים");
  const xml = await kmlEntry.async("string");
  return parsePersonalPointsFromKml(xml);
}
