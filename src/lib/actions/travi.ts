"use server";

import { prisma } from "@/lib/prisma";
import { haversineKm } from "@/lib/geo";

export type TraviSuggestion = { id: string; name: string; categoryName: string; areaName: string; distanceKm: number | null };
export type TraviReply = { text: string; suggestions: TraviSuggestion[] };

const CATEGORY_INTENTS: { keywords: string[]; categoryFragments: string[]; label: string }[] = [
  { keywords: ["מסעד", "לאכול", "ארוחה", "ערב", "צהריים"], categoryFragments: ["מסעד"], label: "מסעדות" },
  { keywords: ["קפה", "בראנץ", "קפא", "בוקר"], categoryFragments: ["קפה", "בראנץ"], label: "בתי קפה" },
  { keywords: ["בר", "שתייה", "דרינק", "חיי לילה", "מסיבה", "קלאב"], categoryFragments: ["בר", "לילה", "מסיב"], label: "ברים וחיי לילה" },
  { keywords: ["מוזיאון", "תרבות", "גלריה", "אמנות"], categoryFragments: ["מוזיאון"], label: "מוזיאונים" },
  { keywords: ["פארק", "טבע", "טיול רגלי", "ירוק"], categoryFragments: ["פארק"], label: "פארקים" },
  { keywords: ["מלון", "לינה", "לישון"], categoryFragments: ["מלון"], label: "מלונות" },
  { keywords: ["אטרקציה", "לעשות", "לבקר", "פעילות", "מה יש", "מומלץ"], categoryFragments: ["אטרקצי", "כללי"], label: "אטרקציות" },
];

const FAQ_INTENTS: { keywords: string[]; answer: string }[] = [
  { keywords: ["מסלול", "לתכנן", "לבנות מסלול"], answer: "במסך \"מסלול\" תוכלו להוסיף ימים ונקודות, לגרור ולסדר מחדש, ואפילו לבקש מהמערכת ליצור לכם מסלול אוטומטי לפי הימים והתחומי עניין שתבחרו." },
  { keywords: ["תקציב", "הוצאות", "כסף שהוצאתי"], answer: "במסך \"הוצאות\" תוכלו לרשום הוצאות לפי יום, להגדיר תקציב כולל, ולראות כמה נשאר לכם ליום הנוכחי." },
  { keywords: ["מועדפים", "לשמור נקודה", "לשמור מקום"], answer: "לוחצים על הלב ⭐ על כל נקודה במפה או ברשימה כדי לשמור אותה למועדפים — הם יופיעו במסך \"מועדפים\"." },
  { keywords: ["אופליין", "בלי אינטרנט", "אין רשת"], answer: "אחרי שנכנסתם פעם אחת לכל מסך, התוכן נשמר במכשיר ונגיש גם בלי אינטרנט." },
  { keywords: ["מיקום שלי", "gps", "ניווט", "מסלול אליי"], answer: "במסך \"מפה\" יש כפתור 📍 המיקום שלי — הוא מראה לכם היכן אתם, ממיין את הרשימה לפי קרבה, ואם תלחצו על נקודה הוא יסמן מסלול הליכה אליה." },
  { keywords: ["חידון", "משחק", "לבדוק את עצמי"], answer: "יש לכם מסך \"חידונים\" עם 10 שאלות כיפיות על ההיסטוריה, הגאוגרפיה והתרבות של היעד." },
];

function normalize(s: string): string {
  return s.trim().toLowerCase();
}

export async function askTravi(
  destinationId: string,
  message: string,
  userPosition?: { lat: number; lng: number } | null
): Promise<TraviReply> {
  const q = normalize(message);
  if (!q) return { text: "ספרו לי מה אתם מחפשים — למשל \"מסעדה טובה בסביבה\" או \"מה יש לעשות פה\".", suggestions: [] };

  if (["שלום", "היי", "hi", "hello", "מה קורה"].some((g) => q.includes(g))) {
    return {
      text: "היי! אני טראבי 🧭 — אני מכיר את כל הנקודות שיש לכם ביעד הזה. תשאלו אותי דברים כמו \"מסעדה טובה בסביבה\", \"מה יש לעשות היום\", או שאלות על השימוש באפליקציה.",
      suggestions: [],
    };
  }

  const faqMatch = FAQ_INTENTS.find((f) => f.keywords.some((k) => q.includes(k)));
  if (faqMatch) return { text: faqMatch.answer, suggestions: [] };

  const intent = CATEGORY_INTENTS.find((c) => c.keywords.some((k) => q.includes(k)));
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

    if (pois.length === 0) {
      return {
        text: `לא מצאתי ${intent.label} במאגר שלנו ליעד הזה כרגע. נסו לחפש ישירות במפה של גוגל, או תבדקו את מסך \"מפה\" שלנו עם סינון לפי קטגוריה — יכול להיות שיש תוצאות דומות תחת שם אחר.`,
        suggestions: [],
      };
    }

    const withDistance: TraviSuggestion[] = pois.map((p) => ({
      id: p.id,
      name: p.name,
      categoryName: p.category.name,
      areaName: p.category.area.name,
      distanceKm: userPosition ? haversineKm([userPosition.lat, userPosition.lng], [p.lat, p.lng]) : null,
    }));

    const sorted = userPosition ? withDistance.sort((a, b) => (a.distanceKm ?? 0) - (b.distanceKm ?? 0)) : withDistance;
    const top = sorted.slice(0, 5);

    return {
      text: userPosition
        ? `הנה ${intent.label} קרובים אליכם:`
        : `הנה כמה ${intent.label} מהמאגר שלנו — הפעילו מיקום כדי שאמיין לפי קרבה:`,
      suggestions: top,
    };
  }

  return {
    text: "לא הצלחתי לזהות בקשה ספציפית מהמאגר שלנו. נסו לנסח מחדש (למשל \"בר בסביבה\" או \"איך שומרים מועדפים\"), או חפשו ישירות במפה שלנו עם הסינון לפי קטגוריה.",
    suggestions: [],
  };
}
