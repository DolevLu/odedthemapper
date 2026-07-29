const ICONS: { match: RegExp; path: string }[] = [
  // בר / ברים / חיי לילה — beer mug
  {
    match: /בר|לילה|drink|pub/i,
    path: "M5 3h9v2h2a3 3 0 0 1 3 3v2a3 3 0 0 1-3 3h-1.17A5 5 0 0 1 10 15H8a5 5 0 0 1-5-5V3zm11 4v4a1 1 0 0 0 1-1V8a1 1 0 0 0-1-1zM6 19h8v2H6v-2z",
  },
  // מסעדות — fork & knife
  {
    match: /מסעד|אוכל|food|restaurant/i,
    path: "M6 2v7a2 2 0 0 0 2 2v11h2V11a2 2 0 0 0 2-2V2H6zm10 0a3 3 0 0 0-3 3v6a2 2 0 0 0 2 2v9h2V2z",
  },
  // בתי קפה / בראנץ׳ — coffee cup
  {
    match: /קפה|בראנץ|גלידה|coffee|cafe/i,
    path: "M4 3h13v9a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5V3zm13 3h2a2 2 0 0 1 2 2v1a2 2 0 0 1-2 2h-2V6zM4 19h13v2H4z",
  },
  // מוזיאונים — columned building
  {
    match: /מוזיא|גלר|museum|gallery/i,
    path: "M12 2 2 8h20zM4 9v10H2v2h20v-2h-2V9h-2v10h-3V9h-2v10h-3V9H8v10H5V9z",
  },
  // מטרו / תחנות רכבת — train
  {
    match: /מטרו|רכבת|תחבורה|metro|train|station/i,
    path: "M12 2C7 2 4 3 4 8v6a4 4 0 0 0 4 4l-2 2v1h12v-1l-2-2a4 4 0 0 0 4-4V8c0-5-3-6-8-6zM7 8h10v5H7zM7.5 16A1.5 1.5 0 1 1 6 17.5 1.5 1.5 0 0 1 7.5 16zm9 0a1.5 1.5 0 1 1-1.5 1.5 1.5 1.5 0 0 1 1.5-1.5z",
  },
  // שופינג / שווקים — bag
  {
    match: /שופינג|קניות|שוק|market|shop/i,
    path: "M7 6V5a5 5 0 0 1 10 0v1h3l1 15H3L4 6zm2 0h6V5a3 3 0 0 0-6 0z",
  },
  // פארקים — tree
  {
    match: /פארק|גן|park|garden/i,
    path: "M12 2 7 9h2l-4 6h4v2h-2v3h10v-3h-2v-2h4l-4-6h2z",
  },
  // מסיבות / חיי לילה — music note
  {
    match: /מסיב|party|club/i,
    path: "M9 3v11.17A3.5 3.5 0 1 0 11 17V7h6V3z",
  },
  // שווקי חג / קריסמס — gift/star
  {
    match: /חג|כריסמס|market/i,
    path: "M12 2l2.5 5 5.5.8-4 3.9.9 5.5L12 14.8 7.1 17.2l.9-5.5-4-3.9L9.5 7z",
  },
  // מלונות — bed
  {
    match: /מלונ|hotel/i,
    path: "M3 7h2v6h7V9a2 2 0 0 1 2-2h5a2 2 0 0 1 2 2v9h-2v-3H5v3H3zm5 1a2 2 0 1 1-2 2 2 2 0 0 1 2-2z",
  },
  // ערים / עיירות — flag/map
  {
    match: /עיר|עיירה|road trip|town/i,
    path: "M4 2v20h2v-7h11l-2-4 2-4H6V2z",
  },
];

const DEFAULT_PATH = "M12 2a7 7 0 0 0-7 7c0 5.25 7 13 7 13s7-7.75 7-13a7 7 0 0 0-7-7zm0 9.5A2.5 2.5 0 1 1 14.5 9 2.5 2.5 0 0 1 12 11.5z";

function pathForCategory(name: string): string {
  const found = ICONS.find((i) => i.match.test(name));
  return found?.path ?? DEFAULT_PATH;
}

export function CategoryIcon({ name, size = 18 }: { name: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="white" aria-hidden="true">
      <path d={pathForCategory(name)} />
    </svg>
  );
}
