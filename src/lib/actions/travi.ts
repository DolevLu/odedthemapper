"use server";

import { prisma } from "@/lib/prisma";
import { haversineKm } from "@/lib/geo";

export type TraviSuggestion = { id: string; name: string; categoryName: string; areaName: string; distanceKm: number | null };
export type TraviReply = { text: string; suggestions: TraviSuggestion[] };

const CATEGORY_INTENTS: { keywords: string[]; categoryFragments: string[]; label: string }[] = [
  {
    keywords: ["מסעד", "לאכול", "לאכל", "ארוחת ערב", "ארוחת צהריים", "ערב", "צהריים", "רעב", "רעבה", "אוכל", "מנה", "שף", "פיצה", "פסטה", "המבורגר", "לזון"],
    categoryFragments: ["מסעד"],
    label: "מסעדות",
  },
  {
    keywords: ["קפה", "בראנץ", "קפא", "ארוחת בוקר", "בוקר", "קרואסון", "עוגה", "מאפה", "אספרסו", "לתת קפה"],
    categoryFragments: ["קפה", "בראנץ"],
    label: "בתי קפה",
  },
  {
    keywords: ["בר ", "לבר", "שתייה", "שתות", "לשתות", "דרינק", "חיי לילה", "מסיבה", "קלאב", "בירה", "יין", "אלכוהול", "קוקטייל", "פאב"],
    categoryFragments: ["בר", "לילה", "מסיב"],
    label: "ברים וחיי לילה",
  },
  { keywords: ["מוזיאון", "תרבות", "גלריה", "אמנות", "תערוכה"], categoryFragments: ["מוזיאון"], label: "מוזיאונים" },
  { keywords: ["פארק", "טבע", "טיול רגלי", "ירוק", "גן ציבורי", "פיקניק", "שביל"], categoryFragments: ["פארק"], label: "פארקים" },
  { keywords: ["מלון", "לינה", "לישון", "לינה", "הוסטל", "לחפש חדר"], categoryFragments: ["מלון"], label: "מלונות" },
  {
    keywords: ["אטרקצי", "לעשות", "לבקר", "פעילות", "מה יש", "מומלץ", "כדאי", "אתר תיירות", "נוף", "לצלם", "משהו מעניין", "בילוי", "מה אפשר"],
    categoryFragments: ["אטרקצי", "כללי"],
    label: "אטרקציות",
  },
];

const FAQ_INTENTS: { keywords: string[]; answer: string }[] = [
  { keywords: ["מסלול", "לתכנן", "לבנות מסלול", "תוכנית טיול", "לארגן את הטיול", "סדר יום"], answer: "במסך \"מסלול\" תוכלו להוסיף ימים ונקודות, לגרור ולסדר מחדש, ואפילו לבקש מהמערכת ליצור לכם מסלול אוטומטי לפי הימים והתחומי עניין שתבחרו." },
  { keywords: ["תקציב", "הוצאות", "כסף שהוצאתי", "כמה הוצאתי", "לעקוב אחרי כסף"], answer: "במסך \"הוצאות\" תוכלו לרשום הוצאות לפי יום, להגדיר תקציב כולל, ולראות כמה נשאר לכם ליום הנוכחי." },
  { keywords: ["מועדפים", "לשמור נקודה", "לשמור מקום", "איך שומרים", "רשימת שמורים"], answer: "לוחצים על הלב ⭐ על כל נקודה במפה או ברשימה כדי לשמור אותה למועדפים — הם יופיעו במסך \"מועדפים\"." },
  { keywords: ["אופליין", "בלי אינטרנט", "אין רשת", "בלי חיבור"], answer: "אחרי שנכנסתם פעם אחת לכל מסך, התוכן נשמר במכשיר ונגיש גם בלי אינטרנט." },
  { keywords: ["מיקום שלי", "gps", "ניווט", "מסלול אליי", "איפה אני", "להגיע לשם"], answer: "במסך \"מפה\" יש כפתור 📍 המיקום שלי — הוא מראה לכם היכן אתם, ממיין את הרשימה לפי קרבה, ואם תלחצו על נקודה הוא יסמן מסלול הליכה אליה." },
  { keywords: ["חידון", "משחק", "לבדוק את עצמי", "טריוויה"], answer: "יש לכם מסך \"חידונים\" עם חידונים קצרים בספורט, היסטוריה וגאוגרפיה של היעד." },
  { keywords: ["מסמך", "כרטיס טיסה", "אישור הזמנה", "לוגיסטיקה", "דרכון", "ויזה", "ביטוח נסיעות"], answer: "במסך \"לוגיסטיקה\" תוכלו לשמור טיסות, מלונות, כרטיסים, דרכון, ויזה וביטוח — עם תזכורות אוטומטיות לפני שהם מתקרבים." },
  { keywords: ["חג", "חגים", "יום חג", "אירוע קרוב"], answer: "במסך \"להזמנה\" יש לוח חגים קרובים ביעד, כדי לדעת מראש על ימים שבהם עסקים ואתרים עשויים לפעול אחרת." },
];

// Common filler/politeness words stripped before matching, so "תוכל בבקשה
// להגיד לי איפה יש מסעדה טובה" matches just as well as "מסעדה".
const FILLER_WORDS = ["בבקשה", "אתה", "את", "יכול", "יכולה", "תוכל", "תוכלי", "אפשר", "אולי", "רוצה", "אני", "לי", "מה", "יש", "איפה", "תגיד", "תמליץ", "לך", "לכם"];

const FILLER_SET = new Set(FILLER_WORDS);

/** Drops whole filler-word tokens (exact match only — never a substring
 * replace, which would corrupt real words that merely contain "מה"/"יש"/etc
 * as part of a longer word, e.g. "מהר"). */
function normalize(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter((word) => !FILLER_SET.has(word))
    .join(" ");
}

const STOP_WORDS = new Set(["של", "עם", "את", "על", "כדי", "הכי", "טוב", "טובה", "קרוב", "קרובה", "בסביבה", "פה", "כאן"]);

/** Last-resort fallback: search POI/category names directly for any
 * significant word in the message — catches things like a POI named
 * explicitly ("קולוסיאום") that no fixed intent list would anticipate. */
async function rawSearch(destinationId: string, q: string): Promise<TraviSuggestion[]> {
  const tokens = q.split(" ").filter((t) => t.length >= 3 && !STOP_WORDS.has(t));
  if (tokens.length === 0) return [];

  const pois = await prisma.pointOfInterest.findMany({
    where: {
      geometryType: "point",
      category: { area: { destinationId } },
      OR: tokens.flatMap((t) => [{ name: { contains: t } }, { category: { name: { contains: t } } }]),
    },
    include: { category: { include: { area: true } } },
    take: 5,
  });

  return pois.map((p) => ({ id: p.id, name: p.name, categoryName: p.category.name, areaName: p.category.area.name, distanceKm: null }));
}

export async function askTravi(
  destinationId: string,
  message: string,
  userPosition?: { lat: number; lng: number } | null
): Promise<TraviReply> {
  const rawQ = message.trim().toLowerCase();
  if (!rawQ) return { text: "ספרו לי מה אתם מחפשים — למשל \"מסעדה טובה בסביבה\" או \"מה יש לעשות פה\".", suggestions: [] };

  if (["שלום", "היי", "hi", "hello", "מה קורה", "מה נשמע"].some((g) => rawQ.includes(g))) {
    return {
      text: "היי! אני טראבי 🧭 — אני מכיר את כל הנקודות שיש לכם ביעד הזה. תשאלו אותי דברים כמו \"מסעדה טובה בסביבה\", \"מה יש לעשות היום\", או שאלות על השימוש באפליקציה.",
      suggestions: [],
    };
  }

  const q = normalize(rawQ);

  const faqMatch = FAQ_INTENTS.find((f) => f.keywords.some((k) => rawQ.includes(k) || q.includes(k)));
  if (faqMatch) return { text: faqMatch.answer, suggestions: [] };

  const intent = CATEGORY_INTENTS.find((c) => c.keywords.some((k) => rawQ.includes(k) || q.includes(k)));
  if (intent) {
    const pois = await prisma.pointOfInterest.findMany({
      where: {
        geometryType: "point",
        category: {
          area: { destinationId },
          OR: intent.categoryFragments.map((f) => ({ name: { contains: f } })),
        },
      },
      include: { category: { include: { area: true } } },
      take: 60,
    });

    if (pois.length > 0) {
      const withDistance: TraviSuggestion[] = pois.map((p) => ({
        id: p.id,
        name: p.name,
        categoryName: p.category.name,
        areaName: p.category.area.name,
        distanceKm: userPosition ? haversineKm([userPosition.lat, userPosition.lng], [p.lat, p.lng]) : null,
      }));
      const sorted = userPosition ? withDistance.sort((a, b) => (a.distanceKm ?? 0) - (b.distanceKm ?? 0)) : withDistance;

      return {
        text: userPosition ? `הנה ${intent.label} קרובים אליכם:` : `הנה כמה ${intent.label} מהמאגר שלנו — הפעילו מיקום כדי שאמיין לפי קרבה:`,
        suggestions: sorted.slice(0, 5),
      };
    }
  }

  // No fixed intent matched (or matched but the category is empty for this
  // destination) — fall back to a raw keyword search across POI/category names.
  const fallbackResults = await rawSearch(destinationId, q);
  if (fallbackResults.length > 0) {
    return { text: "מצאתי כמה תוצאות שעשויות להתאים מהמאגר שלנו:", suggestions: fallbackResults };
  }

  return {
    text: "לא הצלחתי למצוא משהו מתאים מהמאגר שלנו לשאלה הזו. נסו לנסח אחרת (למשל \"בר בסביבה\", \"קולוסיאום\" או שם מקום ספציפי), או חפשו ישירות במפה שלנו עם הסינון לפי קטגוריה.",
    suggestions: [],
  };
}
