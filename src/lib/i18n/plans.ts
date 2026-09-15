import type { PlanKey } from "@/lib/plans";
import type { Lang } from "@/lib/i18n/dictionary";

type PlanText = { name: string; audience: string; tagline: string; features: string[] };

/** Free, static translation for the pricing/plan copy in lib/plans.ts —
 * kept separate from dictionary.ts (short single-string UI labels) since
 * this is per-plan structured content (name/audience/tagline/feature
 * lists), not a flat key->string map. Order of `features` must match the
 * Hebrew source in lib/plans.ts exactly, since callers zip them together
 * by index (see translatePlan) rather than by feature text. */
const PLAN_TEXT: Record<"trial" | PlanKey, Record<Lang, PlanText>> = {
  trial: {
    he: {
      name: "ניסיון חינם",
      audience: "לכל מי שרוצה לנסות לפני שמשלמים",
      tagline: "24 שעות, יעד אחד, כל התכונות פתוחות - בלי כרטיס אשראי.",
      features: [
        "גישה מלאה ליעד אחד לבחירה, ל-24 שעות",
        "כל התכונות של שאר התוכניות - מפה, מסלול, AI, שיחון ועוד",
        "עד 10 הודעות ביום לטראבי, עוזר הטיול החכם 🧭",
        "פעם אחת בלבד למשתמש",
      ],
    },
    en: {
      name: "Free Trial",
      audience: "For anyone who wants to try before paying",
      tagline: "24 hours, one destination, every feature unlocked - no credit card.",
      features: [
        "Full access to one destination of your choice, for 24 hours",
        "Every feature the other plans have - map, itinerary, AI, phrasebook and more",
        "Up to 10 messages a day to Travi, your smart trip assistant 🧭",
        "Once per user only",
      ],
    },
  },
  solo: {
    he: {
      name: "מטייל בודד",
      audience: "למטיילים בודדים",
      tagline: "כל מה שצריך ליעד אחד - מפה, מסלול ותקציב במקום אחד.",
      features: [
        "חוויה נקייה - בלי פרסומות 🚫📢",
        "גישה מלאה ליעד אחד לבחירה, עם אפשרות להחליף יעד פעם ב-14 יום",
        "מפה אינטראקטיבית עם כל הנקודות והקטגוריות",
        'מסך "מה עכשיו" - המלצות לפי קרבה אליכם',
        "מתכנן מסלול יומי אישי + ייצוא כ-PDF",
        "מועדפים ורשימת אטרקציות להזמנה",
        "מעקב הוצאות ותקציב יומי",
        "שיחון, ציוד וצ׳ק ליסט וגלריה",
        "מצב אופליין",
        "משתמש אחד בלבד",
        "עד 10 הודעות ביום לטראבי, עוזר הטיול החכם 🧭",
      ],
    },
    en: {
      name: "Solo Traveler",
      audience: "For solo travelers",
      tagline: "Everything you need for one destination - map, itinerary and budget in one place.",
      features: [
        "A clean experience - no ads 🚫📢",
        "Full access to one destination of your choice, with the option to swap destinations once every 14 days",
        "An interactive map with every point and category",
        '"What\'s Now" screen - recommendations based on your location',
        "A personal daily itinerary planner + PDF export",
        "Favorites and a bookable attractions list",
        "Expense tracking and a daily budget",
        "Phrasebook, packing checklist and gallery",
        "Offline mode",
        "One user only",
        "Up to 10 messages a day to Travi, your smart trip assistant 🧭",
      ],
    },
  },
  family: {
    he: {
      name: "משפחות ונוודים דיגיטלים",
      audience: "למשפחות או נוודים דיגיטלים",
      tagline: "מתכננים כמה יעדים בו-זמנית ורוצים לשתף עם כל המשפחה? קיבלתם.",
      features: [
        "חוויה נקייה - בלי פרסומות 🚫📢",
        "גישה עד 5 יעדים לבחירה, עם אפשרות להחליף כל יעד בנפרד פעם ב-14 יום",
        "כל התכונות של תוכנית המטייל הבודד",
        "עד 5 משתמשים תחת אותו מנוי - מזמינים לפי אימייל",
        "כל משתמש רואה ועורך את אותם מסלולים, מועדפים ותקציב",
        "תמיכה מועדפת",
        "עד 30 הודעות ביום לטראבי, עוזר הטיול החכם 🧭",
      ],
    },
    en: {
      name: "Families & Digital Nomads",
      audience: "For families or digital nomads",
      tagline: "Planning several destinations at once and want to share with the whole family? Got you.",
      features: [
        "A clean experience - no ads 🚫📢",
        "Access to up to 5 destinations of your choice, each independently swappable once every 14 days",
        "Everything the Solo Traveler plan has",
        "Up to 5 users under the same subscription - invited by email",
        "Every user sees and edits the same itineraries, favorites and budget",
        "Priority support",
        "Up to 30 messages a day to Travi, your smart trip assistant 🧭",
      ],
    },
  },
  org: {
    he: {
      name: "ארגונים ומתכנני טיולים",
      audience: "לארגונים או מתכנני טיולים",
      tagline: "בונים טיולים ללקוחות? נהלו הכל במקום אחד.",
      features: [
        "חוויה נקייה - בלי פרסומות 🚫📢",
        "גישה לכל היעדים במערכת ללא הגבלה",
        "תכנון מסלול מקצועי ללקוחות - ימים, שעות ואופטימיזציית מרחקים",
        "הצעות מחיר וחוזים: מסמך מקצועי עם קישור לאישור הלקוח",
        "מיתוג אישי - לוגו ושם העסק על מסלולים ומסמכים ללקוח",
        "הרשאות ניהול תוכן: הוספה ועריכה של יעדים ונקודות",
        "ייצוא מסלולים כ-PDF ממותג + קישור צפייה ללקוחות (ללא צורך בחשבון)",
        "מספר משתמשים בלתי מוגבל בצוות",
        "עד 100 הודעות ביום לטראבי, עוזר הטיול החכם 🧭",
      ],
    },
    en: {
      name: "Agencies & Trip Planners",
      audience: "For agencies or trip planners",
      tagline: "Building trips for clients? Manage it all in one place.",
      features: [
        "A clean experience - no ads 🚫📢",
        "Unlimited access to every destination in the system",
        "Professional itinerary planning for clients - days, hours and distance optimization",
        "Quotes and contracts: a professional document with a client approval link",
        "Personal branding - your logo and business name on client itineraries and documents",
        "Content management permissions: add and edit destinations and points",
        "Export branded itineraries as PDF + a view link for clients (no account needed)",
        "Unlimited team members",
        "Up to 100 messages a day to Travi, your smart trip assistant 🧭",
      ],
    },
  },
};

export function translatePlan(lang: Lang, planKey: "trial" | PlanKey): PlanText {
  return PLAN_TEXT[planKey][lang];
}
