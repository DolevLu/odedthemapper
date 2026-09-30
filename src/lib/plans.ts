export type PlanKey = "solo" | "family" | "org" | "plus";

// Shown (and specially emphasized, see PricingCards) only on plans that
// actually remove ads — the free tier keeps showing them (see AdSenseScript's
// own `summary.plan.key === "free"` check), so it's deliberately absent from
// FREE_PLAN's own features list.
export const AD_FREE_FEATURE = "חוויה נקייה - בלי פרסומות 🚫📢";

export type Plan = {
  // "trial"/"free" aren't real PlanKey entries (see TRIAL_PLAN/FREE_PLAN below) but resolvePlan() returns them in
  // this same Plan shape, so the type has to allow for it — every real PLANS[key] still only ever has a PlanKey.
  key: PlanKey | "trial" | "free";
  name: string;
  audience: string;
  monthlyCents: number;
  annualCents: number; // total for the year (discounted vs monthly * 12)
  destinationLimit: number | null; // null = unlimited
  seats: number | null; // total users allowed under one subscription; null = unlimited
  isOrgTier: boolean;
  // Unlimited destination access WITHOUT the org tier's content-management rights (canManageContent stays gated on
  // isOrgTier alone) — every access check that currently reads isOrgTier for "every destination" also checks this.
  allDestinations?: boolean;
  aiChatDailyQuota: number; // Travi AI chat messages per calendar day (Gemini calls cost money — see lib/aiChatQuota.ts)
  tagline: string;
  features: string[];
  highlighted?: boolean;
  // Kept only so old Subscription rows with this key still resolve (limits,
  // quotas, receipts). Never offered for purchase - see PURCHASABLE_PLANS.
  legacy?: boolean;
};

// 2026-10-01 business-model change: the old self-serve 24h/1-destination TRIAL_PLAN is now what every user gets
// permanently — see FREE_PLAN below. TRIAL_PLAN itself is kept only so any historical Subscription row with
// planKey "trial" (created before this change) still resolves correctly (limits, quotas, receipts); no new trial
// subscriptions are created anymore (see lib/actions/trial.ts).
export const TRIAL_PLAN = {
  key: "trial" as const,
  name: "ניסיון חינם",
  audience: "לכל מי שרוצה לנסות לפני שמשלמים",
  monthlyCents: 0,
  annualCents: 0,
  destinationLimit: 1,
  seats: 1,
  isOrgTier: false,
  allDestinations: false,
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

// The permanent free tier every user gets by default — not a PLANS entry for the same reason TRIAL_PLAN wasn't
// (see access.ts, which special-cases planKey "free" directly wherever it matters: AI chat quota, ads gating, the
// subscription summary). A real, permanent (no expiry) Subscription row with planKey "free" is what actually grants
// this — see startFreeAccess in lib/actions/trial.ts, which creates it the first time a user picks their one
// destination. The 14-day swap cooldown is the exact same SubscriptionDestination.assignedAt + swapSubscriptionDestination
// mechanism solo/family already used, just applied to a $0, never-expiring subscription instead of a paid one.
export const FREE_PLAN = {
  key: "free" as const,
  name: "חינמי",
  audience: "לכל מי שרוצה לתכנן טיול בלי לשלם",
  monthlyCents: 0,
  annualCents: 0,
  destinationLimit: 1,
  seats: 1,
  isOrgTier: false,
  allDestinations: false,
  aiChatDailyQuota: 10,
  tagline: "חינם לתמיד, יעד אחד בכל פעם - עם אפשרות להחליף כל 14 יום.",
  features: [
    "גישה מלאה ליעד אחד לבחירה - לתמיד, בלי הגבלת זמן",
    "אפשרות להחליף יעד פעם ב-14 יום",
    "כל התכונות עצמן - מפה, מסלול, טראבי לייב, שיחון ועוד",
    "עד 10 הודעות ביום לטראבי, עוזר הטיול החכם 🧭",
    "כולל פרסומות",
  ],
};

export const PLANS: Record<PlanKey, Plan> = {
  // Legacy plans below: kept exactly as they were so anyone still on one of these (grandfathered before the
  // 2026-10-01 pricing change) keeps the access/quota/receipts they're actually paying for. None of the three are
  // offered for purchase anymore (see PURCHASABLE_PLANS) — the one plan on sale now is "plus", below.
  solo: {
    legacy: true,
    key: "solo",
    name: "מטייל בודד",
    audience: "למטיילים בודדים",
    monthlyCents: 12500,
    annualCents: 112500,
    destinationLimit: 1,
    seats: 1,
    isOrgTier: false,
    aiChatDailyQuota: 10,
    tagline: "כל מה שצריך ליעד אחד - מפה, מסלול ותקציב במקום אחד.",
    features: [
      AD_FREE_FEATURE,
      "גישה מלאה ליעד אחד לבחירה, עם אפשרות להחליף יעד פעם ב-14 יום",
      "מפה אינטראקטיבית עם כל הנקודות והקטגוריות",
      "מסך \"טראבי לייב\" - המלצות לפי קרבה אליכם",
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
    legacy: true,
    key: "family",
    name: "מטיילים, משפחות ונוודים",
    audience: "למטיילים, למשפחות ולנוודים דיגיטליים",
    monthlyCents: 12500,
    annualCents: 112500,
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
  // The one plan actually on sale now: cheap, simple, removes the free tier's two frictions (ads + the lower AI
  // quota) and unlocks every destination — no per-destination picking/swapping at all, same as org, just without
  // org's content-management rights (see allDestinations vs isOrgTier above).
  plus: {
    key: "plus",
    name: "Travi Plus",
    audience: "למי שרוצה חוויה נקייה וגישה לכל היעדים",
    monthlyCents: 3000,
    annualCents: 36000, // same monthly rate — no annual plan, no discount; kept purely so the Plan type/shared math (formatIls etc.) still has a number to read.
    destinationLimit: null,
    seats: 1,
    isOrgTier: false,
    allDestinations: true,
    aiChatDailyQuota: 30,
    tagline: "בלי פרסומות, גישה לכל היעדים, ועד 30 הודעות ביום ל-AI. וזהו.",
    features: [
      AD_FREE_FEATURE,
      "גישה לכל היעדים במערכת, בלי הגבלה ובלי להחליף",
      "עד 30 הודעות ביום לטראבי, עוזר הטיול החכם 🧭 (במקום 10 בחינמי)",
    ],
    highlighted: true,
  },
  org: {
    key: "org",
    name: "ארגונים ומתכנני טיולים",
    audience: "לארגונים או מתכנני טיולים",
    monthlyCents: 49500,
    annualCents: 445500,
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

/** Resolves ANY Subscription.planKey (including "free" and "trial", neither of which is a real PLANS entry — see
 * FREE_PLAN/TRIAL_PLAN above) to its actual Plan-shaped object. Every call site that used to do a raw
 * PLANS[sub.planKey] must use this instead: that lookup returns undefined for a free/trial row, which either
 * silently mis-renders (optional chaining swallowing it) or throws outright (a direct .property access) depending
 * on the call site — both wrong, since free/trial subscriptions are completely normal, common rows, not an edge
 * case. */
export function resolvePlan(planKey: string): Plan {
  if (planKey === "free") return FREE_PLAN;
  if (planKey === "trial") return TRIAL_PLAN;
  // Same trust level the old direct PLANS[sub.planKey] lookups everywhere already had: a genuinely unknown planKey
  // was never actually handled gracefully before this function existed either, so this isn't a new risk.
  return PLANS[planKey as PlanKey];
}

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
  plus: "PLUS",
};

export function tierBadgeForPlanKey(planKey: PlanKey | "trial" | "free" | null): string {
  if (!planKey) return "FREE";
  if (planKey === "trial") return "TRIAL";
  if (planKey === "free") return "FREE";
  return TIER_BADGES[planKey];
}
