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

// Kept as reference context fed to Gemini (so it can accurately explain app
// features even when the phrasing doesn't match any fixed keyword list) and
// as a zero-cost fast path if Gemini is unavailable.
// One entry per app screen (matches APP_SCREENS_REFERENCE) so an app-usage
// question always gets a real, correct answer even when Gemini is
// unavailable/slow/times out — not just the handful of screens someone
// happened to add a keyword list for. Checked before the "couldn't find
// anything" catch-all, so nothing app-related ever falls through to that.
const FAQ_INTENTS: { keywords: string[]; answer: string }[] = [
  { keywords: ["איך משתמשים במפה", "להשתמש במפה", "לסנן במפה", "סינון קטגור", "מפה לפי קטגור"], answer: "במסך \"מפה\" רואים את כל הנקודות על מפת גוגל, עם צבע לפי קטגוריה. לוחצים על סיכה כדי לראות פרטים, מסננים לפי קטגוריה עם הכפתורים למעלה, ולוחצים על 📍 כדי למיין לפי קרבה למיקום שלכם." },
  { keywords: ["מסלול", "לתכנן", "לבנות מסלול", "תוכנית טיול", "לארגן את הטיול", "סדר יום"], answer: "במסך \"מסלול\" תוכלו להוסיף ימים ונקודות, לגרור ולסדר מחדש, ואפילו לבקש מהמערכת ליצור לכם מסלול אוטומטי לפי הימים והתחומי עניין שתבחרו." },
  { keywords: ["תקציב", "הוצאות", "כסף שהוצאתי", "כמה הוצאתי", "לעקוב אחרי כסף"], answer: "במסך \"הוצאות\" תוכלו לרשום הוצאות לפי יום, להגדיר תקציב כולל, ולראות כמה נשאר לכם ליום הנוכחי." },
  { keywords: ["מועדפים", "לשמור נקודה", "לשמור מקום", "איך שומרים", "רשימת שמורים"], answer: "לוחצים על הלב ⭐ על כל נקודה במפה או ברשימה כדי לשמור אותה למועדפים - הם יופיעו במסך \"מועדפים\"." },
  { keywords: ["אופליין", "בלי אינטרנט", "אין רשת", "בלי חיבור"], answer: "אחרי שנכנסתם פעם אחת לכל מסך, התוכן נשמר במכשיר ונגיש גם בלי אינטרנט." },
  { keywords: ["מיקום שלי", "gps", "ניווט", "מסלול אליי", "איפה אני", "להגיע לשם"], answer: "במסך \"מפה\" יש כפתור 📍 המיקום שלי - הוא מראה לכם היכן אתם, ממיין את הרשימה לפי קרבה, ואם תלחצו על נקודה הוא יסמן מסלול הליכה אליה." },
  { keywords: ["חידון", "משחק", "לבדוק את עצמי", "טריוויה"], answer: "יש לכם מסך \"חידונים\" עם חידונים קצרים בספורט, היסטוריה וגאוגרפיה של היעד." },
  { keywords: ["מסמך", "כרטיס טיסה", "אישור הזמנה", "לוגיסטיקה", "דרכון", "ויזה", "ביטוח נסיעות"], answer: "במסך \"לוגיסטיקה\" תוכלו לשמור טיסות, מלונות, כרטיסים, דרכון, ויזה וביטוח - עם תזכורות אוטומטיות לפני שהם מתקרבים." },
  { keywords: ["חג", "חגים", "יום חג", "אירוע קרוב"], answer: "במסך \"להזמנה\" יש לוח חגים קרובים ביעד, כדי לדעת מראש על ימים שבהם עסקים ואתרים עשויים לפעול אחרת." },
  { keywords: ["מה עכשיו", "מה כדאי עכשיו", "מה לעשות עכשיו", "המלצה עכשיו"], answer: "במסך \"מה עכשיו\" יש המלצות לפי קרבה למיקום שלכם, שעון מקומי מול שעון הבית, וכפתור מידע חירום עם שקעים/ויזה/טיפים." },
  { keywords: ["מזג אוויר", "תחזית", "גשם", "טמפרטורה"], answer: "במסך \"מזג אוויר\" יש תחזית ליומיים הקרובים ביעד." },
  { keywords: ["שיחון", "מילים בשפה", "לתרגם", "תרגום", "הגייה"], answer: "במסך \"שיחון\" יש מילים וביטויים שימושיים בשפה המקומית, כולל הקראה קולית של ההגייה." },
  { keywords: ["ציוד", "מה לקחת", "צ'ק ליסט", "רשימת אריזה", "מה לארוז"], answer: "במסך \"ציוד וצ'ק ליסט\" יש רשימת ציוד מומלצת לפני הטיסה, עם אפשרות לסמן מה כבר ארזתם." },
  { keywords: ["אלבום", "תמונות מהטיול", "וידאו", "קולאז'"], answer: "במסך \"אלבום\" אפשר להעלות תמונות ווידאו מהטיול וליצור מהם קולאז'ים." },
];

// Short reference of every screen, given to Gemini as context so it can
// answer app-usage questions accurately regardless of phrasing.
const APP_SCREENS_REFERENCE = `
מסכי האפליקציה הזמינים למשתמש ביעד:
- מה עכשיו: קטגוריות נקודות עניין (מסעדות, ברים, קפה, מוזיאונים, פארקים וכו') עם מיון לפי קרבה
- מפה: מפה אינטראקטיבית עם כל הנקודות, סינון קטגוריה, וניווט לפי מיקום נוכחי
- מסלול: בניית מסלול יומי - הוספת נקודות לימים, גרירה לשינוי סדר, יצירת מסלול אוטומטי
- מועדפים: נקודות ואטרקציות שסומנו בלב, כולל המלצות "אסור לפספס" וטיפים לפני הנסיעה
- להזמנה: אטרקציות שכדאי להזמין מראש, ולוח חגים קרובים ביעד
- לוגיסטיקה: שמירת טיסות/מלונות/מסמכים עם תזכורות, ומפת חום להמלצת שכונת לינה
- הוצאות: מעקב הוצאות יומי מול תקציב שהוגדר
- חידונים: שלושה חידוני טריוויה (ספורט/היסטוריה/כללי) ליעד
- שיחון: מילים וביטויים בשפה המקומית עם הקראה קולית
- ציוד וצ'ק ליסט: רשימת ציוד לפני טיסה
- אלבום: העלאת תמונות/וידאו וקולאז'ים מהטיול
`.trim();

const FILLER_WORDS = ["בבקשה", "אתה", "את", "יכול", "יכולה", "תוכל", "תוכלי", "אפשר", "אולי", "רוצה", "אני", "לי", "מה", "יש", "איפה", "תגיד", "תמליץ", "לך", "לכם"];
const FILLER_SET = new Set(FILLER_WORDS);

function normalize(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter((word) => !FILLER_SET.has(word))
    .join(" ");
}

const STOP_WORDS = new Set(["של", "עם", "את", "על", "כדי", "הכי", "טוב", "טובה", "קרוב", "קרובה", "בסביבה", "פה", "כאן"]);

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

function matchIntentSuggestions(rawQ: string, q: string) {
  const intent = CATEGORY_INTENTS.find((c) => c.keywords.some((k) => rawQ.includes(k) || q.includes(k)));
  if (!intent) return null;
  return { intent };
}

/** Calls Gemini (gemini-2.5-flash) to compose the actual reply text. Given
 * real POI suggestions (if any were found) plus app/FAQ context, so it can
 * ground its answer in real data instead of inventing places, while still
 * being able to answer general questions and understand varied phrasing
 * that a fixed keyword list would miss. Returns null on any failure so the
 * caller can fall back to the deterministic keyword-matching logic. */
async function askGemini(params: {
  message: string;
  destinationName: string;
  suggestions: TraviSuggestion[];
  intentLabel: string | null;
}): Promise<string | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  const { message, destinationName, suggestions, intentLabel } = params;

  const suggestionsBlock =
    suggestions.length > 0
      ? `נמצאו במאגר שלנו הנקודות הרלוונטיות הבאות ל"${intentLabel}" (רשימה אמיתית - אסור להמציא נקודות נוספות שלא ברשימה):\n${suggestions
          .map((s) => `- ${s.name} (${s.categoryName}, ${s.areaName})`)
          .join("\n")}`
      : "לא נמצאו נקודות עניין רלוונטיות במאגר שלנו לשאלה הזו - אם השאלה היא על נקודת עניין/מקום ביעד, ציינו זאת בעדינות והציעו לחפש במפה; אם זו שאלה כללית (טיפ נסיעה, תרגום, ידע כללי, מזג אוויר, וכו') ענו עליה ישירות מהידע הכללי שלכם.";

  const systemPrompt = `אתם "טראבי" 🧭, עוזר טיולים ידידותי בתוך אפליקציית "עודד המנקד" ליעד ${destinationName}. ענו בעברית, קצר וממוקד (2-4 משפטים לכל היותר), בטון חם וישיר.

${APP_SCREENS_REFERENCE}

${suggestionsBlock}

כללים:
- אם יש נקודות מהמאגר למעלה - התייחסו אליהן בשמן בתשובה באופן טבעי (הן כבר יוצגו למשתמש ככרטיסיות נפרדות, אין צורך לפרט כתובות).
- אם השאלה עוסקת בשימוש באפליקציה - ענו לפי רשימת המסכים למעלה בלבד, אל תמציאו תכונות שלא קיימות שם.
- אם השאלה כללית לגמרי (לא על נקודות עניין ולא על האפליקציה) - ענו ישירות מהידע הכללי שלכם בהיגיון וכנות.
- לעולם אל תמציאו שם של מסעדה/בר/אטרקציה שלא הופיע ברשימה שסופקה.`;

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemPrompt }] },
          contents: [{ role: "user", parts: [{ text: message }] }],
          // thinkingBudget:0 — confirmed live that without this, the current
          // default model can burn part or all of maxOutputTokens on internal
          // reasoning before writing any visible reply text, returning
          // finishReason "MAX_TOKENS" with an EMPTY response and no error —
          // likely a real contributor to this exact endpoint's earlier-observed
          // slowness/timeouts, not just a theoretical risk. Travi's replies are
          // meant to be fast conversational answers, not deep reasoning.
          generationConfig: { maxOutputTokens: 1024, temperature: 0.6, thinkingConfig: { thinkingBudget: 0 } },
        }),
        // Confirmed live (this exact question, twice in a row) that the
        // flash model can take longer than 15s to respond — 25s gives real
        // slow responses a chance to land instead of forcing every one of
        // them onto the FAQ fallback, which — while now covering every
        // screen — is still a fixed canned answer rather than Gemini's
        // actual understanding of arbitrary phrasing.
        signal: AbortSignal.timeout(25000),
      }
    );
    if (!res.ok) {
      console.error("Gemini API error:", res.status, await res.text().catch(() => ""));
      return null;
    }
    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text as string | undefined;
    return text?.trim() || null;
  } catch (err) {
    console.error("Gemini call failed:", err);
    return null;
  }
}

export async function askTravi(
  destinationId: string,
  message: string,
  userPosition?: { lat: number; lng: number } | null
): Promise<TraviReply> {
  const rawQ = message.trim().toLowerCase();
  if (!rawQ) return { text: "ספרו לי מה אתם מחפשים - למשל \"מסעדה טובה בסביבה\" או \"מה יש לעשות פה\".", suggestions: [] };

  if (["שלום", "היי", "hi", "hello", "מה קורה", "מה נשמע"].some((g) => rawQ.includes(g))) {
    return {
      text: "היי! אני טראבי 🧭 - אני מכיר את כל הנקודות שיש לכם ביעד הזה. תשאלו אותי דברים כמו \"מסעדה טובה בסביבה\", \"מה יש לעשות היום\", או שאלות על השימוש באפליקציה.",
      suggestions: [],
    };
  }

  const q = normalize(rawQ);

  // Gather real, DB-grounded suggestions via the existing keyword matcher
  // (used both as the fast path and as grounding context for Gemini).
  let suggestions: TraviSuggestion[] = [];
  let intentLabel: string | null = null;
  const matched = matchIntentSuggestions(rawQ, q);
  if (matched) {
    intentLabel = matched.intent.label;
    const pois = await prisma.pointOfInterest.findMany({
      where: {
        geometryType: "point",
        category: {
          area: { destinationId },
          OR: matched.intent.categoryFragments.map((f) => ({ name: { contains: f } })),
        },
      },
      include: { category: { include: { area: true } } },
      take: 60,
    });
    const withDistance: TraviSuggestion[] = pois.map((p) => ({
      id: p.id,
      name: p.name,
      categoryName: p.category.name,
      areaName: p.category.area.name,
      distanceKm: userPosition ? haversineKm([userPosition.lat, userPosition.lng], [p.lat, p.lng]) : null,
    }));
    const sorted = userPosition ? withDistance.sort((a, b) => (a.distanceKm ?? 0) - (b.distanceKm ?? 0)) : withDistance;
    suggestions = sorted.slice(0, 5);
  } else {
    suggestions = await rawSearch(destinationId, q);
  }

  const destination = await prisma.destination.findUnique({ where: { id: destinationId }, select: { name: true } });

  // Gemini composes the actual reply — grounded in the real suggestions
  // above, with app/FAQ context, and able to answer general questions or
  // varied phrasing that the fixed keyword lists would otherwise miss.
  const geminiText = await askGemini({
    message,
    destinationName: destination?.name ?? "היעד",
    suggestions,
    intentLabel,
  });
  if (geminiText) return { text: geminiText, suggestions };

  // Gemini unavailable/failed — fall back to the original deterministic logic.
  const faqMatch = FAQ_INTENTS.find((f) => f.keywords.some((k) => rawQ.includes(k) || q.includes(k)));
  if (faqMatch) return { text: faqMatch.answer, suggestions: [] };

  if (suggestions.length > 0) {
    return {
      text: intentLabel
        ? userPosition
          ? `הנה ${intentLabel} קרובים אליכם:`
          : `הנה כמה ${intentLabel} מהמאגר שלנו - הפעילו מיקום כדי שאמיין לפי קרבה:`
        : "מצאתי כמה תוצאות שעשויות להתאים מהמאגר שלנו:",
      suggestions,
    };
  }

  return {
    text: "לא הצלחתי למצוא משהו מתאים מהמאגר שלנו לשאלה הזו. נסו לנסח אחרת (למשל \"בר בסביבה\", \"קולוסיאום\" או שם מקום ספציפי), או חפשו ישירות במפה שלנו עם הסינון לפי קטגוריה.",
    suggestions: [],
  };
}
