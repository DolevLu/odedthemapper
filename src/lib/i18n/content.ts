import type { Lang } from "@/lib/i18n/dictionary";

/** Display-only English labels for DB content that is stored in Hebrew (destination names/taglines, category and
 * area names). The stored values stay Hebrew — they are also the keys several features match on (icons, colors,
 * filters, "restaurant"/"cafe" intent detection) — so these helpers are applied only where a label is SHOWN, and
 * only when the UI language is English. Anything not covered (a name already in Latin script, or a rare one-off
 * category) is returned unchanged rather than guessed at. */

const DEST_EN: Record<string, { name: string; tagline: string }> = {
  argentina: { name: "Argentina", tagline: "Tango, Patagonia and the magic of Buenos Aires" },
  austria: { name: "Austria", tagline: "The Alps, imperial Vienna and classical music" },
  budapest: { name: "Budapest", tagline: "A beautiful, affordable and close destination" },
  cambodia: { name: "Cambodia", tagline: "Angkor Wat and living history among the trees" },
  china: { name: "China", tagline: "The most surprising destination" },
  copenhagen: { name: "Copenhagen", tagline: "The most underrated destination" },
  croatia: { name: "Croatia", tagline: "Adriatic coast and walled towns" },
  cyprus: { name: "Cyprus", tagline: "Turquoise beaches and Mediterranean history" },
  denmark: { name: "Denmark", tagline: "" },
  dubai: { name: "Dubai", tagline: "Skyscrapers, desert and endless glamour" },
  england: { name: "England", tagline: "London, castles and classic British atmosphere" },
  estonia: { name: "Estonia", tagline: "Tallinn - the best-preserved old town in the Baltics" },
  france: { name: "France", tagline: "Paris, wine and classic European charm" },
  greece: { name: "Greece", tagline: "Blue-and-white islands and Mediterranean food" },
  hongkong: { name: "Hong Kong & Macau", tagline: "Skyscrapers, neon and colonial Macau" },
  israel: { name: "Israel", tagline: "Israel" },
  italy: { name: "Italy", tagline: "The boot-shaped country, tourist favorite" },
  japan: { name: "Japan", tagline: "The trendiest destination in the world" },
  korea: { name: "Korea", tagline: "Technology, K-pop and ancient culture" },
  laos: { name: "Laos", tagline: "Untouched nature and calm among temples and rivers" },
  latvia: { name: "Latvia", tagline: "Riga - Art Nouveau architecture and Baltic charm" },
  lithuania: { name: "Lithuania", tagline: "Vilnius - a baroque old town and Baltic amber" },
  malta: { name: "Malta", tagline: "Limestone islands and sun among fortresses" },
  netherlands: { name: "Netherlands", tagline: "Canals, bicycles and colorful fields" },
  norway: { name: "Norway", tagline: "Dramatic fjords and wild nature" },
  philippines: { name: "Philippines", tagline: "Thousands of islands, tropical beaches and world-class diving" },
  poland: { name: "Poland", tagline: "Warsaw, Krakow, Gdansk and the rest" },
  portugal: { name: "Portugal", tagline: "Beaches, azulejos and a relaxed vibe" },
  prague: { name: "Prague", tagline: "A perfect destination for summer and Christmas" },
  romania: { name: "Romania", tagline: "Castles in the Carpathians and Transylvanian legends" },
  singapore: { name: "Singapore", tagline: "A modern city-state with an Asian flavor" },
  spain: { name: "Spain", tagline: "Flamenco, tapas and lively nightlife" },
  sweden: { name: "Sweden", tagline: "Scandinavian design, lakes and quiet cities" },
  switzerland: { name: "Switzerland", tagline: "The Alps, blue lakes and spotless cities" },
  tanzania: { name: "Tanzania & Zanzibar", tagline: "African safari and tropical beaches" },
  thailand: { name: "Thailand", tagline: "The beloved destination in the East" },
  usa: { name: "USA", tagline: "The classic American road trip" },
  vietnam: { name: "Vietnam", tagline: "A complete, comprehensive tour of the East" },
};

export function destName(lang: Lang, slug: string, he: string): string {
  return lang === "en" ? (DEST_EN[slug]?.name ?? he) : he;
}

export function destTagline(lang: Lang, slug: string, he: string | null): string | null {
  if (lang !== "en") return he;
  const en = DEST_EN[slug]?.tagline;
  return en === undefined ? he : en || null;
}

// Ordered: the first matching rule wins. Mirrors how the app already buckets category names (see lib/mapStyles.ts).
const CATEGORY_RULES: [RegExp, string][] = [
  [/טרקים מומלצים/, "Recommended trails"],
  [/ברים.*(מועדונ|מעודונ|מועודונ|לילה)|מועדוני לילה|18\+/, "Bars & nightlife"],
  [/^ברים$/, "Bars"],
  [/מועדונ/, "Nightclubs"],
  [/בראנץ|גלידה/, "Cafés & brunch"],
  [/קפה/, "Cafés"],
  [/מסעד/, "Restaurants"],
  [/מוזיא/, "Museums"],
  [/פארק/, "Parks"],
  [/כריסמס/, "Christmas markets"],
  [/שופינג.*קניונ|קניונ/, "Shopping malls"],
  [/שופינג/, "Shopping"],
  [/מטרו|רכבת/, "Metro & train stations"],
  [/תחב/, "Public transport"],
  [/תצפית/, "Viewpoints"],
  [/חופים/, "Beaches"],
  [/מעבורות|רכבל/, "Ferries & cable cars"],
  [/מקדש/, "Temples"],
  [/מלונות/, "Hotels"],
  [/ספארי/, "Safari agencies"],
  [/תבלינים/, "Spice farms"],
  [/אטרקציות כללי|אטרקציות וכללי|אטרקציות ואתרים כלליים/, "General attractions"],
  [/אטרקציות/, "Attractions"],
  [/ערים|עיירות|יישובים/, "Towns & cities"],
  [/יום דרום/, "South day trip"],
  [/יום צפון/, "North day trip"],
  [/יום ירושלים/, "Jerusalem day trip"],
  [/יום תל אביב/, "Tel Aviv day trip"],
  [/^כללי/, "General"],
];

export function categoryLabel(lang: Lang, name: string): string {
  if (lang !== "en" || !/[֐-׿]/.test(name)) return name;
  for (const [re, en] of CATEGORY_RULES) if (re.test(name)) return en;
  return name;
}

const AREA_EN: Record<string, string> = {
  פראג: "Prague", וינה: "Vienna", בודפשט: "Budapest", אמסטרדם: "Amsterdam", פריז: "Paris", רומא: "Rome",
  ברצלונה: "Barcelona", מדריד: "Madrid", ליסבון: "Lisbon", פורטו: "Porto", אתונה: "Athens", וילנה: "Vilnius",
  בוקרשט: "Bucharest", סיאול: "Seoul", בנגקוק: "Bangkok", דובאי: "Dubai", ונציה: "Venice", נאפולי: "Naples",
  פירנצה: "Florence", מילאנו: "Milan", סטוקהולם: "Stockholm", אוסלו: "Oslo", "קרקוב ורשה": "Krakow & Warsaw",
  כללי: "General", בונוס: "Bonus", טיול: "Trip", "ערים ועיירות": "Towns & cities", "ערים עיירות": "Towns & cities",
  "רואד טריפ": "Road trip", "שאר יוון": "Rest of Greece",
};

export function areaLabel(lang: Lang, name: string): string {
  if (lang !== "en" || !/[֐-׿]/.test(name)) return name;
  return AREA_EN[name.trim()] ?? name;
}

const ROUTE_EN: Record<string, string> = { "מסלול מעגלי": "Loop", "הלוך ושוב": "Out & back", "מנקודה לנקודה": "Point to point" };
const DIFF_EN: Record<string, string> = { קל: "Easy", בינוני: "Moderate", קשה: "Hard", מאתגר: "Strenuous" };

/** Tags on the seeded AllTrails points ("קושי קל", "הלוך ושוב", ...). */
export function tagLabel(lang: Lang, tag: string): string {
  if (lang !== "en") return tag;
  const d = tag.match(/^קושי (.+)$/);
  if (d) return `${DIFF_EN[d[1]] ?? d[1]} difficulty`;
  return ROUTE_EN[tag] ?? tag;
}

/** The two generated description formats the app stores in Hebrew: the "X — category באזור area, city." line given
 * to points without a real description, and the AllTrails stats line (see scripts/seed-alltrails.cjs). Any other
 * description is hand-written content and is returned unchanged. */
export function poiDescription(lang: Lang, text: string | null): string | null {
  if (lang !== "en" || !text) return text;
  const auto = text.match(/^(.+?) — (.+?) באזור (.+?)(?:, (.+?))?\.?$/);
  if (auto) {
    const [, name, cat, area, city] = auto;
    return `${name} — ${categoryLabel(lang, cat)} in the ${areaLabel(lang, area)} area${city ? `, ${areaLabel(lang, city)}` : ""}.`;
  }
  if (text.startsWith("🥾")) {
    return text
      .split(" · ")
      .map((part) => {
        const p = part.replace("🥾 ", "");
        if (ROUTE_EN[p]) return `🥾 ${ROUTE_EN[p]}`;
        const km = p.match(/^([\d.]+) ק״מ$/);
        if (km) return `${km[1]} km`;
        const hm = p.match(/^(?:(\d+) שע׳)?(?: ?ו-)?(?:(\d+) דק׳)?$/);
        if (hm && (hm[1] || hm[2])) return [hm[1] ? `${hm[1]} h` : "", hm[2] ? `${hm[2]} min` : ""].filter(Boolean).join(" ");
        const diff = p.match(/^קושי (.+)$/);
        if (diff) return `${DIFF_EN[diff[1]] ?? diff[1]} difficulty`;
        const gain = p.match(/^עלייה (\d+) מ׳$/);
        if (gain) return `${gain[1]} m gain`;
        const rate = p.match(/^⭐ ([\d.]+) ב-AllTrails$/);
        if (rate) return `⭐ ${rate[1]} on AllTrails`;
        return part;
      })
      .join(" · ");
  }
  return text;
}
