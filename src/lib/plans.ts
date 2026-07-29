export type PlanKey = "solo" | "family" | "org";

export type Plan = {
  key: PlanKey;
  name: string;
  audience: string;
  monthlyCents: number;
  annualCents: number; // total for the year (discounted vs monthly * 12)
  destinationLimit: number | null; // null = unlimited (org tier)
  seats: number | null; // total users allowed under one subscription; null = unlimited
  isOrgTier: boolean;
  tagline: string;
  features: string[];
  highlighted?: boolean;
};

export const PLANS: Record<PlanKey, Plan> = {
  solo: {
    key: "solo",
    name: "מטייל בודד",
    audience: "למטיילים בודדים",
    monthlyCents: 2500,
    annualCents: 24000, // ~$20/mo effective, 2 months free
    destinationLimit: 1,
    seats: 1,
    isOrgTier: false,
    tagline: "כל מה שצריך ליעד אחד — מפה, מסלול ותקציב במקום אחד.",
    features: [
      "גישה מלאה ליעד אחד לבחירה, עם אפשרות להחליף יעד פעם ב-14 יום",
      "מפה אינטראקטיבית עם כל הנקודות והקטגוריות",
      "מסך \"מה עכשיו\" — המלצות לפי קרבה אליכם",
      "מתכנן מסלול יומי אישי + ייצוא כ-PDF",
      "מועדפים ורשימת אטרקציות להזמנה",
      "מעקב הוצאות ותקציב יומי",
      "שיחון, ציוד וצ׳ק ליסט וגלריה",
      "מצב אופליין",
      "משתמש אחד בלבד",
    ],
  },
  family: {
    key: "family",
    name: "משפחות ונוודים דיגיטלים",
    audience: "למשפחות או נוודים דיגיטלים",
    monthlyCents: 7500,
    annualCents: 72000,
    destinationLimit: 5,
    seats: 5,
    isOrgTier: false,
    tagline: "מתכננים כמה יעדים בו-זמנית ורוצים לשתף עם כל המשפחה? קיבלתם.",
    features: [
      "גישה עד 5 יעדים לבחירה, עם אפשרות להחליף כל יעד בנפרד פעם ב-14 יום",
      "כל התכונות של תוכנית המטייל הבודד",
      "עד 5 משתמשים תחת אותו מנוי — מזמינים לפי אימייל",
      "כל משתמש רואה ועורך את אותם מסלולים, מועדפים ותקציב",
      "תמיכה מועדפת",
    ],
    highlighted: true,
  },
  org: {
    key: "org",
    name: "ארגונים ומתכנני טיולים",
    audience: "לארגונים או מתכנני טיולים",
    monthlyCents: 19500,
    annualCents: 187200,
    destinationLimit: null,
    seats: null,
    isOrgTier: true,
    tagline: "בונים טיולים ללקוחות? נהלו הכל במקום אחד.",
    features: [
      "גישה לכל היעדים במערכת ללא הגבלה",
      "תכנון מסלול מקצועי ללקוחות — ימים, שעות ואופטימיזציית מרחקים",
      "הצעות מחיר וחוזים: מסמך מקצועי עם קישור לאישור הלקוח",
      "מיתוג אישי — לוגו ושם העסק על מסלולים ומסמכים ללקוח",
      "הרשאות ניהול תוכן: הוספה ועריכה של יעדים ונקודות",
      "ייצוא מסלולים כ-PDF ממותג + קישור צפייה ללקוחות (ללא צורך בחשבון)",
      "מספר משתמשים בלתי מוגבל בצוות",
    ],
  },
};

export function annualMonthlyEquivalent(plan: Plan): number {
  return Math.round(plan.annualCents / 12);
}

export function annualSavingsPercent(plan: Plan): number {
  const fullYear = plan.monthlyCents * 12;
  return Math.round(((fullYear - plan.annualCents) / fullYear) * 100);
}

export function formatUsd(cents: number): string {
  return `$${(cents / 100).toFixed(cents % 100 === 0 ? 0 : 2)}`;
}
