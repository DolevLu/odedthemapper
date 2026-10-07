import type { PlanKey } from "@/lib/plans";
import type { Lang } from "@/lib/i18n/dictionary";

type PlanText = { name: string; audience: string; tagline: string; features: string[] };

/** Free, static translation for the pricing/plan copy in lib/plans.ts —
 * kept separate from dictionary.ts (short single-string UI labels) since
 * this is per-plan structured content (name/audience/tagline/feature
 * lists), not a flat key->string map. Order of `features` must match the
 * Hebrew source in lib/plans.ts exactly, since callers zip them together
 * by index (see translatePlan) rather than by feature text. */
const PLAN_TEXT: Record<"trial" | "free" | PlanKey, Record<Lang, PlanText>> = {
  // Historical only (see TRIAL_PLAN in lib/plans.ts) — no new "trial" subscriptions are created anymore.
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
  free: {
    he: {
      name: "שבוע חינם",
      audience: "לכל מי שרוצה לנסות לפני שמשלמים",
      tagline: "שבוע שלם, יעד אחד לבחירה, כל התכונות פתוחות - בלי כרטיס אשראי.",
      features: [
        "גישה מלאה ליעד אחד לבחירה, ל-7 ימים מרגע ההרשמה",
        "כל התכונות עצמן - מפה, מסלול, טראבי לייב, שיחון ועוד",
        "עד 10 הודעות ביום לטראבי, עוזר הטיול החכם 🧭",
        "ועוד עשרות פיצרים לטיול מקצה לקצה",
        "שבוע אחד בלבד לכל משתמש",
        "כולל פרסומות",
      ],
    },
    en: {
      name: "Free week",
      audience: "For anyone who wants to try before paying",
      tagline: "A whole week, one destination of your choice, every feature unlocked - no credit card.",
      features: [
        "Full access to one destination of your choice, for 7 days from sign-up",
        "Every real feature - map, itinerary, Travi Live, phrasebook and more",
        "Up to 10 messages a day to Travi, your smart trip assistant 🧭",
        "Plus dozens more features for the whole trip, end to end",
        "One week per user only",
        "Includes ads",
      ],
    },
  },
  plus: {
    he: {
      name: "Travi Plus",
      audience: "למי שרוצה חוויה נקייה וגישה לכל היעדים",
      tagline: "בלי פרסומות, גישה לכל היעדים, ועד 30 הודעות ביום ל-AI. וזהו.",
      features: [
        "חוויה נקייה - בלי פרסומות 🚫📢",
        "גישה לכל היעדים במערכת, בלי הגבלה ובלי להחליף",
        "עד 30 הודעות ביום לטראבי, עוזר הטיול החכם 🧭",
      ],
    },
    en: {
      name: "Travi Plus",
      audience: "For anyone who wants a clean experience and every destination",
      tagline: "No ads, every destination unlocked, up to 30 AI messages a day. That's it.",
      features: [
        "A clean experience - no ads 🚫📢",
        "Every destination in the system, unlocked - no limit, no swapping",
        "Up to 30 messages a day to Travi, your smart trip assistant 🧭",
      ],
    },
  },
  solo: {
    he: {
      name: "יעד אחד",
      audience: "למטיילים בודדים שיודעים לאן הם נוסעים",
      tagline: "יעד אחד לבחירה, מפה, מסלול וטראבי - בלי פרסומות. למשתמש אחד.",
      features: [
        "חוויה נקייה - בלי פרסומות 🚫📢",
        "גישה מלאה ליעד אחד לבחירה, עם אפשרות להחליף יעד פעם ב-14 יום",
        "כל התכונות - מפה, מסלול, טראבי לייב, שיחון, אלבום ועוד",
        "ועוד עשרות פיצרים לטיול מקצה לקצה",
        "משתמש אחד",
        "עד 30 הודעות ביום לטראבי, עוזר הטיול החכם 🧭",
      ],
    },
    en: {
      name: "One destination",
      audience: "For solo travelers who know where they're going",
      tagline: "One destination of your choice, map, itinerary and Travi - no ads. For one user.",
      features: [
        "A clean experience - no ads 🚫📢",
        "Full access to one destination of your choice, swappable once every 14 days",
        "Every feature - map, itinerary, Travi Live, phrasebook, album and more",
        "Plus dozens more features for the whole trip, end to end",
        "One user",
        "Up to 30 messages a day to Travi, your smart trip assistant 🧭",
      ],
    },
  },
  family: {
    he: {
      name: "כל היעדים",
      audience: "למשפחות, לזוגות ולחברים שמטיילים ביחד",
      tagline: "כל היעדים פתוחים, עד 5 משתמשים בחבילה אחת, תכנון משותף - בלי פרסומות.",
      features: [
        "חוויה נקייה - בלי פרסומות 🚫📢",
        "גישה לכל היעדים במערכת, בלי הגבלה ובלי להחליף",
        "עד 5 משתמשים בחבילה: תכנון משותף, הצבעה והתראות בזמן אמת",
        "כל התכונות - מפה, מסלול, טראבי לייב, שיחון, אלבום ועוד",
        "ועוד עשרות פיצרים לטיול מקצה לקצה",
        "עד 30 הודעות ביום לטראבי, עוזר הטיול החכם 🧭 לכל משתמש",
      ],
    },
    en: {
      name: "All destinations",
      audience: "For families, couples and friends traveling together",
      tagline: "Every destination unlocked, up to 5 users on one plan, shared planning - no ads.",
      features: [
        "A clean experience - no ads 🚫📢",
        "Every destination in the system, unlocked - no limit, no swapping",
        "Up to 5 users on one plan: shared planning, voting and real-time notifications",
        "Every feature - map, itinerary, Travi Live, phrasebook, album and more",
        "Plus dozens more features for the whole trip, end to end",
        "Up to 30 messages a day to Travi, your smart trip assistant 🧭 per user",
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

export function translatePlan(lang: Lang, planKey: "trial" | "free" | PlanKey): PlanText {
  return PLAN_TEXT[planKey][lang];
}
