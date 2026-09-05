const SVG_ICONS: { match: RegExp; path: string }[] = [
  {
    // A beer mug (foam bumps on top + a handle), deliberately distinct from
    // the coffee cup glyph below it — the plain mug-with-handle shape this
    // replaced read as a coffee cup at map-pin size with no way to tell them
    // apart.
    match: /בר|לילה|drink|pub/i,
    path: "M5 8h10v10a3 3 0 0 1-3 3H8a3 3 0 0 1-3-3V8zM15 9h1.5A2.5 2.5 0 0 1 19 11.5v2A2.5 2.5 0 0 1 16.5 16H15V9zM9 5a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM12.5 4.2a2.2 2.2 0 1 1-4.4 0 2.2 2.2 0 0 1 4.4 0zM15.2 5a2 2 0 1 1-4 0 2 2 0 0 1 4 0z",
  },
  {
    match: /מסעד|אוכל|food|restaurant/i,
    path: "M6 2v7a2 2 0 0 0 2 2v11h2V11a2 2 0 0 0 2-2V2H6zm10 0a3 3 0 0 0-3 3v6a2 2 0 0 0 2 2v9h2V2z",
  },
  {
    match: /קפה|בראנץ|גלידה|coffee|cafe/i,
    path: "M4 3h13v9a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5V3zm13 3h2a2 2 0 0 1 2 2v1a2 2 0 0 1-2 2h-2V6zM4 19h13v2H4z",
  },
  {
    match: /מוזיא|גלר|museum|gallery/i,
    path: "M12 2 2 8h20zM4 9v10H2v2h20v-2h-2V9h-2v10h-3V9h-2v10h-3V9H8v10H5V9z",
  },
  {
    match: /מטרו|רכבת|תחבורה|metro|train|station/i,
    path: "M12 2C7 2 4 3 4 8v6a4 4 0 0 0 4 4l-2 2v1h12v-1l-2-2a4 4 0 0 0 4-4V8c0-5-3-6-8-6zM7 8h10v5H7zM7.5 16A1.5 1.5 0 1 1 6 17.5 1.5 1.5 0 0 1 7.5 16zm9 0a1.5 1.5 0 1 1-1.5 1.5 1.5 1.5 0 0 1 1.5-1.5z",
  },
  {
    match: /שופינג|קניות|שוק|market|shop/i,
    path: "M7 6V5a5 5 0 0 1 10 0v1h3l1 15H3L4 6zm2 0h6V5a3 3 0 0 0-6 0z",
  },
  {
    match: /פארק|גן|park|garden/i,
    path: "M12 2 7 9h2l-4 6h4v2h-2v3h10v-3h-2v-2h4l-4-6h2z",
  },
  {
    match: /מסיב|party|club/i,
    path: "M9 3v11.17A3.5 3.5 0 1 0 11 17V7h6V3z",
  },
  {
    match: /חג|כריסמס|market/i,
    path: "M12 2l2.5 5 5.5.8-4 3.9.9 5.5L12 14.8 7.1 17.2l.9-5.5-4-3.9L9.5 7z",
  },
  {
    match: /מלונ|hotel/i,
    path: "M3 7h2v6h7V9a2 2 0 0 1 2-2h5a2 2 0 0 1 2 2v9h-2v-3H5v3H3zm5 1a2 2 0 1 1-2 2 2 2 0 0 1 2-2z",
  },
  {
    match: /עיר|עיירה|road trip|town/i,
    path: "M4 2v20h2v-7h11l-2-4 2-4H6V2z",
  },
];

const DEFAULT_PATH = "M12 2a7 7 0 0 0-7 7c0 5.25 7 13 7 13s7-7.75 7-13a7 7 0 0 0-7-7zm0 9.5A2.5 2.5 0 1 1 14.5 9 2.5 2.5 0 0 1 12 11.5z";

export function pathForCategory(name: string): string {
  const found = SVG_ICONS.find((i) => i.match.test(name));
  return found?.path ?? DEFAULT_PATH;
}

/** Large, realistic emoji per category — matches the reference mockup's
 * illustrated icon style (tea cup, ramen bowl, shopping bags, etc.)
 * instead of flat single-color glyphs. */
const EMOJI_ICONS: { match: RegExp; emoji: string }[] = [
  { match: /תה\b|tea/i, emoji: "🍵" },
  { match: /ראמן|נודלס|ramen|noodle/i, emoji: "🍜" },
  { match: /קרואסון|מאפי|בייקר|croissant|bakery|pastry/i, emoji: "🥐" },
  { match: /מעיינ|אונסן|ספא|onsen|spa|hot spring/i, emoji: "♨️" },
  { match: /מקדש|טוריי|מסגד|temple|shrine|mosque/i, emoji: "⛩️" },
  { match: /מוזיא|גלר|אמנות|museum|gallery|art/i, emoji: "🎨" },
  { match: /בר|לילה|drink|pub|מועדונ|18\+/i, emoji: "🍹" },
  { match: /מסעד|אוכל|food|restaurant/i, emoji: "🍽️" },
  { match: /קפה|בראנץ|גלידה|coffee|cafe|ice cream/i, emoji: "☕" },
  { match: /מטרו|רכבת|תחבורה|תחב"צ|metro|train|station/i, emoji: "🚇" },
  { match: /מעבורות|רכבל|ferry|cable car/i, emoji: "🚡" },
  { match: /שופינג|קניות|שוק|קניונ|market|shop/i, emoji: "🛍️" },
  { match: /פארק|גן|park|garden/i, emoji: "🌳" },
  { match: /נקוד.{0,3}תצפ|viewpoint|lookout/i, emoji: "🔭" },
  { match: /חוף|beach/i, emoji: "🏖️" },
  { match: /איים|island/i, emoji: "🏝️" },
  { match: /מסלול|trail|route|hik/i, emoji: "🥾" },
  { match: /ספארי|safari/i, emoji: "🦁" },
  { match: /מסיב|party|club/i, emoji: "🎉" },
  { match: /חג|כריסמס|market/i, emoji: "🎄" },
  { match: /מלונ|hotel/i, emoji: "🏨" },
  { match: /עיר|עיירה|יישוב|road trip|town/i, emoji: "🏙️" },
];

const DEFAULT_EMOJI = "📍";

export function emojiForCategory(name: string): string {
  const found = EMOJI_ICONS.find((i) => i.match.test(name));
  return found?.emoji ?? DEFAULT_EMOJI;
}

export function CategoryIcon({ name, size = 18 }: { name: string; size?: number }) {
  return (
    <span
      role="img"
      aria-label={name}
      style={{ fontSize: size, lineHeight: 1, display: "inline-block" }}
    >
      {emojiForCategory(name)}
    </span>
  );
}

/** Same category glyph set as the map's own pins (categoryMarkerIcon in
 * lib/mapStyles.ts), reused here as a plain white SVG — an outline glyph on
 * a colored circle reads as one calm, uniform icon system, unlike a full-
 * color emoji per tile (which is what the "מה עכשיו" category grid used to
 * use) sitting on top of an already-colored background. */
export function CategoryGlyphWhite({ name, size = 18 }: { name: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path d={pathForCategory(name)} fill="white" />
    </svg>
  );
}
