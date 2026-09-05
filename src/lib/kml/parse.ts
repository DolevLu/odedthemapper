import { DOMParser } from "@xmldom/xmldom";

export type ParsedPoi = {
  name: string;
  geometryType: "point" | "line" | "polygon";
  lat: number;
  lng: number;
  geometryCoords: [number, number][] | null; // full path for line/polygon, null for point
  descriptionHtml: string | null;
  colorHex: string;
};

export type ParsedCategory = {
  name: string;
  colorHex: string;
  pois: ParsedPoi[];
};

export type ParsedArea = {
  name: string;
  categories: ParsedCategory[];
};

export type ParsedKml = {
  documentName: string;
  areas: ParsedArea[];
};

const DEFAULT_CATEGORY_NAME = "כללי";
const DEFAULT_COLOR = "#3388ff";

export function el(node: Element, tag: string): Element | null {
  for (let i = 0; i < node.childNodes.length; i++) {
    const child = node.childNodes[i];
    if (child.nodeType === 1 && (child as Element).tagName === tag) {
      return child as Element;
    }
  }
  return null;
}

export function elAll(node: Element, tag: string): Element[] {
  const out: Element[] = [];
  for (let i = 0; i < node.childNodes.length; i++) {
    const child = node.childNodes[i];
    if (child.nodeType === 1 && (child as Element).tagName === tag) {
      out.push(child as Element);
    }
  }
  return out;
}

export function text(node: Element | null): string | null {
  if (!node) return null;
  return node.textContent?.trim() || null;
}

export function parseCoordinateBlock(raw: string): [number, number][] {
  return raw
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((triplet) => {
      const [lng, lat] = triplet.split(",").map(Number);
      return [lng, lat] as [number, number];
    });
}

/** Extract color=RRGGBB from a Google Earth icon href, defaulting if absent. */
function colorFromIconHref(href: string | null): string | null {
  if (!href) return null;
  const match = href.match(/[?&]color=([0-9a-fA-F]{6})/);
  return match ? `#${match[1]}` : null;
}

/** Build a map of style id -> icon color by walking Style / gx:CascadingStyle / StyleMap nodes. */
export function buildStyleColorMap(root: Element): Map<string, string> {
  const colorById = new Map<string, string>();
  const styleMapNormalRef = new Map<string, string>(); // StyleMap id -> normal styleUrl id

  const allStyles = [
    ...Array.from(root.getElementsByTagName("Style")),
    ...Array.from(root.getElementsByTagName("gx:CascadingStyle")),
  ];

  for (const styleNode of allStyles) {
    const id = styleNode.getAttribute("id") || styleNode.getAttribute("kml:id");
    if (!id) continue;
    // gx:CascadingStyle wraps an inner <Style>
    const inner = styleNode.tagName === "Style" ? styleNode : el(styleNode, "Style");
    if (!inner) continue;
    const iconStyle = el(inner, "IconStyle");
    const icon = iconStyle ? el(iconStyle, "Icon") : null;
    const href = text(icon ? el(icon, "href") : null);
    const color = colorFromIconHref(href);
    if (color) colorById.set(id, color);
  }

  for (const styleMap of Array.from(root.getElementsByTagName("StyleMap"))) {
    const id = styleMap.getAttribute("id");
    if (!id) continue;
    for (const pair of elAll(styleMap, "Pair")) {
      const key = text(el(pair, "key"));
      const styleUrl = text(el(pair, "styleUrl"));
      if (key === "normal" && styleUrl) {
        styleMapNormalRef.set(id, styleUrl.replace(/^#/, ""));
      }
    }
  }

  // Resolve StyleMap ids to their normal style's color.
  for (const [mapId, normalId] of styleMapNormalRef) {
    const color = colorById.get(normalId);
    if (color) colorById.set(mapId, color);
  }

  return colorById;
}

function resolveColor(styleUrl: string | null, colorMap: Map<string, string>): string {
  if (!styleUrl) return DEFAULT_COLOR;
  const id = styleUrl.replace(/^#/, "");
  return colorMap.get(id) ?? DEFAULT_COLOR;
}

function parsePlacemark(node: Element, colorMap: Map<string, string>): ParsedPoi | null {
  const name = text(el(node, "name")) ?? "ללא שם";
  const styleUrl = text(el(node, "styleUrl"));
  const color = resolveColor(styleUrl, colorMap);

  // description may carry an empty xmlns="" attribute; tag name is still "description".
  const descNode = el(node, "description");
  const descriptionHtml = descNode ? descNode.textContent?.trim() || null : null;

  const point = el(node, "Point");
  if (point) {
    const coordsText = text(el(point, "coordinates"));
    if (!coordsText) return null;
    const [[lng, lat]] = parseCoordinateBlock(coordsText);
    if (lat === undefined || lng === undefined || Number.isNaN(lat) || Number.isNaN(lng)) return null;
    return { name, geometryType: "point", lat, lng, geometryCoords: null, descriptionHtml, colorHex: color };
  }

  const lineString = el(node, "LineString");
  if (lineString) {
    const coordsText = text(el(lineString, "coordinates"));
    if (!coordsText) return null;
    const coords = parseCoordinateBlock(coordsText);
    if (coords.length === 0) return null;
    const [lng, lat] = coords[Math.floor(coords.length / 2)];
    return { name, geometryType: "line", lat, lng, geometryCoords: coords, descriptionHtml, colorHex: color };
  }

  const polygon = el(node, "Polygon");
  if (polygon) {
    const outer = el(polygon, "outerBoundaryIs");
    const ring = outer ? el(outer, "LinearRing") : null;
    const coordsText = text(ring ? el(ring, "coordinates") : null);
    if (!coordsText) return null;
    const coords = parseCoordinateBlock(coordsText);
    if (coords.length === 0) return null;
    const [lng, lat] = coords[0];
    return { name, geometryType: "polygon", lat, lng, geometryCoords: coords, descriptionHtml, colorHex: color };
  }

  return null; // Placemark with no supported geometry (skip).
}

/** Walk a container (Document or Folder) for direct Placemark + nested Folder children. */
function collectDirectPlacemarks(node: Element, colorMap: Map<string, string>): ParsedPoi[] {
  const pois: ParsedPoi[] = [];
  for (const placemarkNode of elAll(node, "Placemark")) {
    const poi = parsePlacemark(placemarkNode, colorMap);
    if (poi) pois.push(poi);
  }
  return pois;
}

export function parseKml(xml: string): ParsedKml {
  const doc = new DOMParser().parseFromString(xml, "text/xml");
  const documentEl = doc.getElementsByTagName("Document")[0] as unknown as Element;
  const root = (documentEl ?? doc.documentElement) as Element;
  const documentName = text(el(root, "name")) ?? "יעד ללא שם";

  const colorMap = buildStyleColorMap(root);
  const areas: ParsedArea[] = [];

  const topFolders = elAll(root, "Folder");

  for (const areaFolder of topFolders) {
    const areaName = text(el(areaFolder, "name")) ?? "אזור ללא שם";
    const categories: ParsedCategory[] = [];

    const subFolders = elAll(areaFolder, "Folder");
    for (const categoryFolder of subFolders) {
      const categoryName = text(el(categoryFolder, "name")) ?? DEFAULT_CATEGORY_NAME;
      const pois = collectDirectPlacemarks(categoryFolder, colorMap);
      const colorHex = pois[0]?.colorHex ?? DEFAULT_COLOR;
      if (pois.length > 0) categories.push({ name: categoryName, colorHex, pois });

      // Support one further nesting level (e.g. מטרו > מסיבות) by flattening
      // grandchild folders into their own category rather than dropping them.
      for (const grandchild of elAll(categoryFolder, "Folder")) {
        const gcName = text(el(grandchild, "name")) ?? DEFAULT_CATEGORY_NAME;
        const gcPois = collectDirectPlacemarks(grandchild, colorMap);
        if (gcPois.length > 0) {
          categories.push({ name: gcName, colorHex: gcPois[0].colorHex, pois: gcPois });
        }
      }
    }

    // Placemarks placed directly under the area folder (no category subfolder),
    // e.g. ונציה in the sample file — bucket them into a default category.
    const directPois = collectDirectPlacemarks(areaFolder, colorMap);
    if (directPois.length > 0) {
      categories.push({ name: DEFAULT_CATEGORY_NAME, colorHex: directPois[0].colorHex, pois: directPois });
    }

    if (categories.length > 0) {
      areas.push({ name: areaName, categories });
    }
  }

  return { documentName, areas };
}

/** Merges the areas from several parsed KML files into one coherent set —
 * used when an admin uploads multiple files for one destination (e.g. one
 * KML per city) instead of a single combined file. Areas/categories with
 * the exact same name across files are combined into one (their POI lists
 * concatenated) rather than creating duplicate rows; anything with a name
 * unique to one file is carried through as-is. First-seen category color
 * wins when the same category name appears in more than one file. */
export function mergeParsedAreas(areaLists: ParsedArea[][]): ParsedArea[] {
  const areaByName = new Map<string, ParsedArea>();

  for (const areas of areaLists) {
    for (const area of areas) {
      let mergedArea = areaByName.get(area.name);
      if (!mergedArea) {
        mergedArea = { name: area.name, categories: [] };
        areaByName.set(area.name, mergedArea);
      }

      const categoryByName = new Map(mergedArea.categories.map((c) => [c.name, c]));
      for (const category of area.categories) {
        const mergedCategory = categoryByName.get(category.name);
        if (mergedCategory) {
          mergedCategory.pois.push(...category.pois);
        } else {
          const copy: ParsedCategory = { name: category.name, colorHex: category.colorHex, pois: [...category.pois] };
          mergedArea.categories.push(copy);
          categoryByName.set(category.name, copy);
        }
      }
    }
  }

  return Array.from(areaByName.values());
}
