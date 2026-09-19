/** The interactive flip-book album: data model, auto-build and the sample book.
 * Stored as JSON in AlbumSettings.bookJson; every reader/writer goes through
 * parseBook so a hand-edited or old value can never crash the viewer. */

export const PAGE_LAYOUTS = ["cover", "full", "duo", "trio", "quad", "collage", "quote"] as const;
export type PageLayout = (typeof PAGE_LAYOUTS)[number];

export const FRAME_STYLES = ["clean", "polaroid", "tape", "film"] as const;
export type FrameStyle = (typeof FRAME_STYLES)[number];

export const BOOK_LOOKS = ["paper", "night", "sunset", "ocean", "mono"] as const;
export type BookLook = (typeof BOOK_LOOKS)[number];

/** How many photo slots each layout has. */
export const LAYOUT_SLOTS: Record<PageLayout, number> = { cover: 1, full: 1, duo: 2, trio: 3, quad: 4, collage: 6, quote: 0 };

export type BookPage = {
  id: string;
  layout: PageLayout;
  frame: FrameStyle;
  /** One entry per slot; "" = an empty slot the traveler hasn't filled yet. */
  photos: string[];
  title: string;
  caption: string;
};

export type AlbumBook = { version: 1; look: BookLook; pages: BookPage[] };

/** Colors for each look: page paper, ink, accent. */
export const LOOK_STYLES: Record<BookLook, { paper: string; ink: string; accent: string; cover: string }> = {
  paper: { paper: "#fbf6ee", ink: "#2b2420", accent: "#c2410c", cover: "linear-gradient(160deg,#fbf6ee,#efe4d0)" },
  night: { paper: "#151a2c", ink: "#f1f5f9", accent: "#a78bfa", cover: "linear-gradient(160deg,#1b2140,#0c1020)" },
  sunset: { paper: "#fff1e6", ink: "#3b1d14", accent: "#e11d48", cover: "linear-gradient(160deg,#ffd6a5,#fb7185)" },
  ocean: { paper: "#ecfeff", ink: "#083344", accent: "#0891b2", cover: "linear-gradient(160deg,#a5f3fc,#38bdf8)" },
  mono: { paper: "#ffffff", ink: "#111111", accent: "#111111", cover: "linear-gradient(160deg,#ffffff,#e5e5e5)" },
};

const MAX_PAGES = 60;
const isLayout = (v: unknown): v is PageLayout => PAGE_LAYOUTS.includes(v as PageLayout);
const isFrame = (v: unknown): v is FrameStyle => FRAME_STYLES.includes(v as FrameStyle);
const isLook = (v: unknown): v is BookLook => BOOK_LOOKS.includes(v as BookLook);
const safeUrl = (v: unknown): string => {
  if (typeof v !== "string") return "";
  const s = v.trim();
  return /^https?:\/\//i.test(s) || s.startsWith("/") ? s.slice(0, 1000) : "";
};

let idCounter = 0;
export function newPageId(): string {
  idCounter += 1;
  return `p${Date.now().toString(36)}${idCounter}${Math.random().toString(36).slice(2, 6)}`;
}

/** Validates untrusted JSON into an AlbumBook (or null when empty/invalid). */
export function parseBook(raw: string | null | undefined): AlbumBook | null {
  if (!raw) return null;
  try {
    const data = JSON.parse(raw);
    if (!data || !Array.isArray(data.pages)) return null;
    const pages: BookPage[] = data.pages.slice(0, MAX_PAGES).map((p: Record<string, unknown>) => {
      const layout = isLayout(p.layout) ? p.layout : "full";
      const slots = LAYOUT_SLOTS[layout];
      const photos = Array.isArray(p.photos) ? p.photos.map(safeUrl) : [];
      while (photos.length < slots) photos.push("");
      return {
        id: typeof p.id === "string" && p.id ? p.id.slice(0, 40) : newPageId(),
        layout,
        frame: isFrame(p.frame) ? p.frame : "clean",
        photos: photos.slice(0, slots),
        title: typeof p.title === "string" ? p.title.slice(0, 80) : "",
        caption: typeof p.caption === "string" ? p.caption.slice(0, 280) : "",
      };
    });
    if (pages.length === 0) return null;
    return { version: 1, look: isLook(data.look) ? data.look : "paper", pages };
  } catch {
    return null;
  }
}

export function serializeBook(book: AlbumBook): string {
  return JSON.stringify({ ...book, pages: book.pages.slice(0, MAX_PAGES) });
}

export function emptyPage(layout: PageLayout = "duo"): BookPage {
  return { id: newPageId(), layout, frame: "clean", photos: Array(LAYOUT_SLOTS[layout]).fill(""), title: "", caption: "" };
}

/** Changing a page's layout keeps as many of its photos as the new layout can hold. */
export function withLayout(page: BookPage, layout: PageLayout): BookPage {
  const photos = [...page.photos.filter(Boolean)];
  const slots = LAYOUT_SLOTS[layout];
  while (photos.length < slots) photos.push("");
  return { ...page, layout, photos: photos.slice(0, slots) };
}

function layoutForCount(n: number): PageLayout {
  if (n >= 5) return "collage";
  if (n === 4) return "quad";
  if (n === 3) return "trio";
  if (n === 2) return "duo";
  return "full";
}

const FRAME_ROTATION: FrameStyle[] = ["polaroid", "clean", "tape", "clean", "polaroid", "film"];

/** Builds a first draft from the traveler's own photos: a cover, then pages
 * grouped by trip day (with the day's title), each sized to how many photos
 * that group has. They then tweak it in the editor. */
export function autoBuildBook(
  photos: { url: string; dayIndex: number | null }[],
  dayTitles: Record<string, { title?: string; subtitle?: string }>,
  destinationName: string,
  dayWord: string
): AlbumBook {
  const pages: BookPage[] = [];
  const cover = emptyPage("cover");
  cover.photos = [photos[0]?.url ?? ""];
  cover.title = destinationName;
  pages.push(cover);

  const byDay = new Map<number | "none", string[]>();
  for (const p of photos) {
    const key = p.dayIndex ?? "none";
    byDay.set(key, [...(byDay.get(key) ?? []), p.url]);
  }
  const keys = [...byDay.keys()].sort((a, b) => (a === "none" ? 1 : b === "none" ? -1 : a - b));
  let frameIdx = 0;
  for (const key of keys) {
    const urls = byDay.get(key)!;
    for (let i = 0; i < urls.length; i += 6) {
      const chunk = urls.slice(i, i + 6);
      const page = emptyPage(layoutForCount(chunk.length));
      page.photos = [...chunk, ...Array(LAYOUT_SLOTS[page.layout] - chunk.length).fill("")].slice(0, LAYOUT_SLOTS[page.layout]);
      page.frame = FRAME_ROTATION[frameIdx++ % FRAME_ROTATION.length];
      if (i === 0 && key !== "none") {
        page.title = dayTitles[String(key)]?.title || `${dayWord} ${key}`;
        page.caption = dayTitles[String(key)]?.subtitle ?? "";
      }
      pages.push(page);
      if (pages.length >= MAX_PAGES) break;
    }
    if (pages.length >= MAX_PAGES) break;
  }
  return { version: 1, look: "paper", pages };
}

/** A read-only example album for every destination, built from that
 * destination's own curated photos so it always looks like the place. */
export function sampleBook(
  photos: { url: string; caption: string }[],
  destinationName: string,
  copy: { subtitle: string; dayPrefix: string; quote: string; caption: string }
): AlbumBook | null {
  const urls = photos.map((p) => p.url);
  if (urls.length === 0) return null;
  const at = (i: number) => urls[i % urls.length];
  const pages: BookPage[] = [];
  const cover = emptyPage("cover");
  cover.photos = [at(0)];
  cover.title = destinationName;
  cover.caption = copy.subtitle;
  pages.push(cover);

  const p1 = emptyPage("full");
  p1.photos = [at(1)];
  p1.frame = "polaroid";
  p1.title = `${copy.dayPrefix} 1`;
  p1.caption = photos[1 % photos.length].caption;
  pages.push(p1);

  const p2 = emptyPage("trio");
  p2.photos = [at(2), at(3), at(4)];
  p2.frame = "tape";
  p2.title = `${copy.dayPrefix} 2`;
  p2.caption = copy.caption;
  pages.push(p2);

  const q = emptyPage("quote");
  q.title = copy.quote;
  pages.push(q);

  const p3 = emptyPage("quad");
  p3.photos = [at(5), at(6), at(7), at(8)];
  p3.frame = "clean";
  p3.title = `${copy.dayPrefix} 3`;
  pages.push(p3);

  const p4 = emptyPage("collage");
  p4.photos = [at(9), at(10), at(11), at(0), at(2), at(4)];
  p4.frame = "film";
  p4.title = "";
  pages.push(p4);

  return { version: 1, look: "sunset", pages };
}
