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

// 2026-10-01 business-model change: the old self-serve 24h/1-destination TRIAL_PLAN was replaced by the free tier —
// see FREE_PLAN below. TRIAL_PLAN itself is kept only so any historical Subscription row with
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

// 2026-10-07 business-model change: the free tier is now ONE FREE WEEK, not forever. The week starts the moment an
// account is created (see grantFreeWeek in lib/freeWeek.ts, which stores User.freeUntil) and is granted once per
// network (IP), not per email — so opening a new account, even from another browser, never earns a second week.
// It is still not a PLANS entry (see access.ts, which special-cases planKey "free" wherever it matters: AI chat quota,
// ads gating, the subscription summary). The real "free" Subscription row — created by startFreeAccess in
// lib/actions/trial.ts when the user picks their one destination — simply ends at User.freeUntil, and every access
// check already filters on currentPeriodEnd, so access stops by itself when the week is over.
export const FREE_WEEK_DAYS = 7;

export const FREE_PLAN = {
  key: "free" as const,
  name: "שבוע חינם",
  audience: "לכל מי שרוצה לנסות לפני שמשלמים",
  monthlyCents: 0,
  annualCents: 0,
  destinationLimit: 1,
  seats: 1,
  isOrgTier: false,
  allDestinations: false,
  aiChatDailyQuota: 10,
  tagline: "שבוע שלם, יעד אחד לבחירה, כל התכונות פתוחות - בלי כרטיס אשראי.",
  features: [
    "גישה מלאה ליעד אחד לבחירה, ל-7 ימים מרגע ההרשמה",
    "כל התכונות עצמן - מפה, מסלול, טראבי לייב, שיחון ועוד",
    "עד 10 הודעות ביום לטראבי, עוזר הטיול החכם 🧭",
    "ועוד עשרות פיצרים לטיול מקצה לקצה",
    "שבוע אחד בלבד לכל משתמש",
    "כולל פרסומות",
  ],
};

export const PLANS: Record<PlanKey, Plan> = {
  // The two plans on sale to consumers (2026-10-07): "solo" — one destination, one user, ₪29/month — and "family" — every
  // destination, up to 5 users sharing the plan, ₪99/month. Both are ad-free with 30 Travi AI messages a day. (The
  // keys are the old ones on purpose: nobody was ever actually paying on the retired ₪125 versions of them, so
  // there is nothing to grandfather, and the whole subscription/seat/swap machinery already keys off these names.)
  solo: {
    key: "solo",
    name: "יעד אחד",
    audience: "למטיילים בודדים שיודעים לאן הם נוסעים",
    monthlyCents: 2900,
    annualCents: 34800, // no annual plan — same monthly rate; kept only so shared price math still has a number to read.
    destinationLimit: 1,
    seats: 1,
    isOrgTier: false,
    aiChatDailyQuota: 30,
    tagline: "יעד אחד לבחירה, מפה, מסלול וטראבי - בלי פרסומות. למשתמש אחד.",
    features: [
      AD_FREE_FEATURE,
      "ביטול חינם בכל רגע, בלי התחייבות ✅",
      "גישה מלאה ליעד אחד לבחירה, עם אפשרות להחליף יעד פעם ב-14 יום",
      "כל התכונות - מפה, מסלול, טראבי לייב, שיחון, אלבום ועוד",
      "ועוד עשרות פיצרים לטיול מקצה לקצה",
      "משתמש אחד",
      "עד 30 הודעות ביום לטראבי, עוזר הטיול החכם 🧭",
    ],
  },
  family: {
    key: "family",
    name: "כל היעדים",
    audience: "למשפחות, לזוגות ולחברים שמטיילים ביחד",
    monthlyCents: 9900,
    annualCents: 118800, // no annual plan — same monthly rate.
    destinationLimit: null,
    seats: 5,
    isOrgTier: false,
    allDestinations: true,
    aiChatDailyQuota: 30,
    tagline: "כל היעדים פתוחים, עד 5 משתמשים בחבילה אחת, תכנון משותף - בלי פרסומות.",
    features: [
      AD_FREE_FEATURE,
      "ביטול חינם בכל רגע, בלי התחייבות ✅",
      "גישה לכל היעדים במערכת, בלי הגבלה ובלי להחליף",
      "עד 5 משתמשים בחבילה: תכנון משותף, הצבעה והתראות בזמן אמת",
      "כל התכונות - מפה, מסלול, טראבי לייב, שיחון, אלבום ועוד",
      "ועוד עשרות פיצרים לטיול מקצה לקצה",
      "עד 30 הודעות ביום לטראבי, עוזר הטיול החכם 🧭 לכל משתמש",
    ],
    highlighted: true,
  },
  // Retired 2026-10-07 (the ₪30 all-destinations plan, on sale for a week) — kept only so any row with this key
  // still resolves. Never offered: see PURCHASABLE_PLANS.
  plus: {
    legacy: true,
    key: "plus",
    name: "Travi Plus",
    audience: "למי שרוצה חוויה נקייה וגישה לכל היעדים",
    monthlyCents: 3000,
    annualCents: 36000,
    destinationLimit: null,
    seats: 1,
    isOrgTier: false,
    allDestinations: true,
    aiChatDailyQuota: 30,
    tagline: "בלי פרסומות, גישה לכל היעדים, ועד 30 הודעות ביום ל-AI. וזהו.",
    features: [
      AD_FREE_FEATURE,
      "גישה לכל היעדים במערכת, בלי הגבלה ובלי להחליף",
      "עד 30 הודעות ביום לטראבי, עוזר הטיול החכם 🧭",
    ],
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
  solo: "SOLO",
  family: "FAMILY",
  org: "PRO",
  plus: "PLUS",
};

export function tierBadgeForPlanKey(planKey: PlanKey | "trial" | "free" | null): string {
  if (!planKey) return "FREE";
  if (planKey === "trial") return "TRIAL";
  if (planKey === "free") return "FREE";
  return TIER_BADGES[planKey];
}
