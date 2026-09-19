export type PlanKey = "solo" | "family" | "org";

// Shown (and specially emphasized, see PricingCards) only on the real paid
// plans below — the free trial still shows ads (see AdSenseScript's own
// `summary.plan.key === "trial"` check), so it's deliberately absent from
// TRIAL_PLAN's own features list.
export const AD_FREE_FEATURE = "חוויה נקייה - בלי פרסומות 🚫📢";

export type Plan = {
  key: PlanKey;
  name: string;
  audience: string;
  monthlyCents: number;
  annualCents: number; // total for the year (discounted vs monthly * 12)
  destinationLimit: number | null; // null = unlimited (org tier)
  seats: number | null; // total users allowed under one subscription; null = unlimited
  isOrgTier: boolean;
  aiChatDailyQuota: number; // Travi AI chat messages per calendar day (Gemini calls cost money — see lib/aiChatQuota.ts)
  tagline: string;
  features: string[];
  highlighted?: boolean;
  // Kept only so old Subscription rows with this key still resolve (limits,
  // quotas, receipts). Never offered for purchase - see PURCHASABLE_PLANS.
  legacy?: boolean;
};

// A 24h/1-destination self-serve free trial — deliberately NOT part of
// PLANS/PlanKey. PLANS is used throughout the real payment/checkout flow
// (/subscribe/[planKey], /api/subscribe, /api/payme/charge, the admin grant
// form, revenue analytics) — folding a non-payable trial into that same
// record would mean explicitly excluding it from over a dozen call sites
// instead of just this one. access.ts special-cases Subscription rows with
// planKey === "trial" directly wherever it actually matters (AI chat quota,
// the subscription summary); every other access check already works
// correctly for an unrecognized plan key with no PLANS entry (falls through
// to the real per-destination check, same as any non-org plan).
export const TRIAL_PLAN = {
  key: "trial" as const,
  name: "ניסיון חינם",
  audience: "לכל מי שרוצה לנסות לפני שמשלמים",
  monthlyCents: 0,
  annualCents: 0,
  destinationLimit: 1,
  seats: 1,
  isOrgTier: false,
  aiChatDailyQuota: 10,
  durationHours: 24,
  tagline: "24 שעות, יעד אחד, כל התכונות פתוחות - בלי כרטיס אשראי.",
  features: [
    "גישה מלאה ליעד אחד לבחירה, ל-24 שעות",
    "כל התכונות של שאר התוכניות - מפה, מסלול, AI, שיחון ועוד",
    "עד 10 הודעות ביום לטראבי, עוזר הטיול החכם 🧭",
    "פעם אחת בלבד למשתמש",
  ],
};

export const PLANS: Record<PlanKey, Plan> = {
  solo: {
    legacy: true,
    key: "solo",
    name: "מטייל בודד",
    audience: "למטיילים בודדים",
    monthlyCents: 12500,
    annualCents: 112500, // 25% הנחה במחויב שנתי
    destinationLimit: 1,
    seats: 1,
    isOrgTier: false,
    aiChatDailyQuota: 10,
    tagline: "כל מה שצריך ליעד אחד - מפה, מסלול ותקציב במקום אחד.",
    features: [
      AD_FREE_FEATURE,
      "גישה מלאה ליעד אחד לבחירה, עם אפשרות להחליף יעד פעם ב-14 יום",
      "מפה אינטראקטיבית עם כל הנקודות והקטגוריות",
      "מסך \"מה עכשיו\" - המלצות לפי קרבה אליכם",
      "מתכנן מסלול יומי אישי + ייצוא כ-PDF",
      "מועדפים ורשימת אטרקציות להזמנה",
      "מעקב הוצאות ותקציב יומי",
      "שיחון, ציוד וצ׳ק ליסט וגלריה",
      "מצב אופליין",
      "משתמש אחד בלבד",
      "עד 10 הודעות ביום לטראבי, עוזר הטיול החכם 🧭",
    ],
  },
  family: {
    key: "family",
    name: "מטיילים, משפחות ונוודים",
    audience: "למטיילים, למשפחות ולנוודים דיגיטליים",
    monthlyCents: 12500,
    annualCents: 112500, // 25% הנחה במחויב שנתי
    destinationLimit: 5,
    seats: 5,
    isOrgTier: false,
    aiChatDailyQuota: 30,
    tagline: "עד 5 יעדים, מפות מוכנות ועשירות, תכנון משותף וטראבי לייב בזמן הטיול.",
    features: [
      AD_FREE_FEATURE,
      "גישה עד 5 יעדים לבחירה, עם אפשרות להחליף כל יעד בנפרד פעם ב-14 יום",
      "טראבי לייב - מה קורה עכשיו: שעה, מזג אוויר, הנקודה הבאה ותכנון מחדש בלחיצה",
      "מפות מוכנות גדולות ועשירות, או בניית מפה מאפס - גם עם AI וייבוא רשימת גוגל",
      "תכנון משותף עד 5 משתמשים: עריכה, הצבעה והתראות בזמן אמת",
      "אלבום דיגיטלי אינטראקטיבי וקולאז'ים",
      "מצב אופליין",
      "רשימת אטרקציות להזמנה וקודי הנחה",
      "מסלול יומי + PDF, מעקב הוצאות, שיחון וצ׳ק ליסט ציוד",
      "תמיכה מועדפת",
      "עד 30 הודעות ביום לטראבי, עוזר הטיול החכם 🧭",
    ],
    highlighted: true,
  },
  org: {
    key: "org",
    name: "ארגונים ומתכנני טיולים",
    audience: "לארגונים או מתכנני טיולים",
    monthlyCents: 49500,
    annualCents: 445500, // 25% הנחה במחויב שנתי
    destinationLimit: null,
    seats: null,
    isOrgTier: true,
    aiChatDailyQuota: 100,
    tagline: "בונים טיולים ללקוחות? נהלו הכל במקום אחד.",
    features: [
      AD_FREE_FEATURE,
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
};

/** The plans actually offered for purchase (everything except legacy keys). */
export const PURCHASABLE_PLANS: Plan[] = Object.values(PLANS).filter((p) => !p.legacy);

export function annualMonthlyEquivalent(plan: Plan): number {
  return Math.round(plan.annualCents / 12);
}

export function annualSavingsPercent(plan: Plan): number {
  const fullYear = plan.monthlyCents * 12;
  return Math.round(((fullYear - plan.annualCents) / fullYear) * 100);
}

export function formatIls(cents: number): string {
  return `${(cents / 100).toFixed(cents % 100 === 0 ? 0 : 2)} ₪`;
}

// Short English badge shown under the logo in the sidebar — deliberately a
// separate naming scheme from the plan's own Hebrew name/audience copy (and
// from the unrelated "silver"/"gold" AccessLevel gating vocabulary used
// elsewhere): just a small status marker, not a rename of the plans
// themselves.
const TIER_BADGES: Record<PlanKey, string> = {
  solo: "GOLD",
  family: "DIAMOND",
  org: "PRO",
};

export function tierBadgeForPlanKey(planKey: PlanKey | "trial" | null): string {
  if (!planKey) return "FREE";
  if (planKey === "trial") return "TRIAL";
  return TIER_BADGES[planKey];
}
