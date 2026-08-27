import { prisma } from "@/lib/prisma";
import { PLANS, type PlanKey } from "@/lib/plans";

const HEBREW_WEEKDAYS = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];
const CONTINENT_LABELS: Record<string, string> = {
  europe: "אירופה",
  asia: "אסיה",
  africa: "אפריקה",
  americas: "אמריקה",
  oceania: "אוקיאניה",
  "middle-east": "המזרח התיכון",
};

function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
function monthLabel(key: string): string {
  const [y, m] = key.split("-").map(Number);
  return new Intl.DateTimeFormat("he-IL", { month: "short", year: "2-digit" }).format(new Date(y, m - 1, 1));
}
/** Last `n` month keys ending at the current month, oldest first. */
function lastMonthKeys(n: number): string[] {
  const out: string[] = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    out.push(monthKey(new Date(now.getFullYear(), now.getMonth() - i, 1)));
  }
  return out;
}
function jerusalemWeekdayHour(d: Date): { weekday: number; hour: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Jerusalem",
    weekday: "short",
    hour: "numeric",
    hourCycle: "h23",
  }).formatToParts(d);
  const weekdayStr = parts.find((p) => p.type === "weekday")?.value ?? "Sun";
  const hourStr = parts.find((p) => p.type === "hour")?.value ?? "0";
  const WEEKDAY_ORDER = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  return { weekday: Math.max(0, WEEKDAY_ORDER.indexOf(weekdayStr)), hour: Number(hourStr) % 24 };
}
function pctChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

export type FinancialSummary = Awaited<ReturnType<typeof getFinancialSummary>>;
export type UsageSummary = Awaited<ReturnType<typeof getUsageSummary>>;

/** Everything the financial dashboard needs, computed from Subscription rows
 * already in the DB — no new payment-side integration required. Revenue
 * figures exclude admin-granted comp subscriptions (grantedByAdmin) so MRR/
 * totals reflect real money only; comp grants are reported separately. */
export async function getFinancialSummary() {
  const subs = await prisma.subscription.findMany({
    select: {
      id: true,
      planKey: true,
      billingCycle: true,
      status: true,
      amountCents: true,
      createdAt: true,
      paidAt: true,
      promoCode: true,
      grantedByAdmin: true,
      user: { select: { referredByUserId: true } },
      destinations: { select: { destination: { select: { continent: true } } } },
    },
  });

  const paid = subs.filter((s) => s.paidAt && !s.grantedByAdmin);
  const active = subs.filter((s) => s.status === "active" && !s.grantedByAdmin);
  const compGrants = subs.filter((s) => s.grantedByAdmin && s.status === "active");

  const totalRevenueCents = paid.reduce((sum, s) => sum + s.amountCents, 0);
  const mrrCents = active.reduce((sum, s) => sum + (s.billingCycle === "monthly" ? s.amountCents : s.amountCents / 12), 0);

  const months = lastMonthKeys(12);
  const revenueByMonthMap = new Map(months.map((m) => [m, 0]));
  const purchasesByMonthMap = new Map(months.map((m) => [m, 0]));
  for (const s of paid) {
    const key = monthKey(s.paidAt!);
    if (revenueByMonthMap.has(key)) {
      revenueByMonthMap.set(key, revenueByMonthMap.get(key)! + s.amountCents);
      purchasesByMonthMap.set(key, purchasesByMonthMap.get(key)! + 1);
    }
  }
  const revenueByMonth = months.map((m) => ({ month: monthLabel(m), revenueIls: Math.round(revenueByMonthMap.get(m)! / 100) }));
  const purchasesByMonth = months.map((m) => ({ month: monthLabel(m), purchases: purchasesByMonthMap.get(m)! }));

  const thisMonthKey = months[months.length - 1];
  const lastMonthKey = months[months.length - 2];
  const revenueGrowthPct = pctChange(revenueByMonthMap.get(thisMonthKey) ?? 0, revenueByMonthMap.get(lastMonthKey) ?? 0);
  const purchaseGrowthPct = pctChange(purchasesByMonthMap.get(thisMonthKey) ?? 0, purchasesByMonthMap.get(lastMonthKey) ?? 0);

  const planMix = (Object.keys(PLANS) as PlanKey[]).map((key) => ({
    plan: PLANS[key].name,
    count: active.filter((s) => s.planKey === key).length,
  }));

  let referred = 0;
  let promo = 0;
  let direct = 0;
  for (const s of paid) {
    if (s.user.referredByUserId) referred++;
    else if (s.promoCode) promo++;
    else direct++;
  }
  const purchaseSource = [
    { source: "הפניית חבר", count: referred },
    { source: "קוד קופון", count: promo },
    { source: "ישיר", count: direct },
  ];

  const destTypeCounts = new Map<string, number>();
  let orgTierCount = 0;
  for (const s of paid) {
    if (PLANS[s.planKey as PlanKey]?.isOrgTier) {
      orgTierCount++;
      continue;
    }
    for (const d of s.destinations) {
      const label = CONTINENT_LABELS[d.destination.continent] ?? d.destination.continent;
      destTypeCounts.set(label, (destTypeCounts.get(label) ?? 0) + 1);
    }
  }
  if (orgTierCount > 0) destTypeCounts.set("כל היעדים (ארגוני)", orgTierCount);
  const destinationTypeMix = [...destTypeCounts.entries()].map(([type, count]) => ({ type, count })).sort((a, b) => b.count - a.count);

  const promoCodeStats = await prisma.promoCode.findMany({
    where: { useCount: { gt: 0 } },
    orderBy: { useCount: "desc" },
    select: { code: true, useCount: true, partnerName: true, discountPercent: true },
  });

  return {
    totalRevenueIls: Math.round(totalRevenueCents / 100),
    mrrIls: Math.round(mrrCents / 100),
    activeSubscriptionCount: active.length,
    compGrantCount: compGrants.length,
    revenueByMonth,
    purchasesByMonth,
    revenueGrowthPct,
    purchaseGrowthPct,
    planMix,
    purchaseSource,
    destinationTypeMix,
    promoCodeStats,
  };
}

/** Usage-pattern data — necessarily a proxy built from existing row-creation
 * timestamps (favorites, quiz attempts, location pings, signups), since the
 * app has no dedicated pageview/event-tracking table. Good enough for real
 * day-of-week/hour-of-day shape and month-over-month trend direction; not a
 * substitute for true analytics instrumentation. */
export async function getUsageSummary() {
  const [users, favorites, quizAttempts, pings, savedPins, itineraryVotes, expenses, albumMedia] = await Promise.all([
    prisma.user.findMany({ select: { createdAt: true } }),
    prisma.favorite.findMany({ select: { createdAt: true, poi: { select: { category: { select: { name: true }, } } } } }),
    prisma.quizAttempt.findMany({ select: { completedAt: true, destination: { select: { name: true } } } }),
    prisma.locationPing.findMany({ select: { recordedAt: true }, take: 20000, orderBy: { recordedAt: "desc" } }),
    prisma.savedMapPin.findMany({ select: { createdAt: true } }),
    prisma.itineraryItemVote.findMany({ select: { createdAt: true } }),
    prisma.expense.findMany({ select: { spentAt: true } }),
    prisma.albumMedia.findMany({ select: { createdAt: true } }),
  ]);

  const activityTimestamps: Date[] = [
    ...favorites.map((f) => f.createdAt),
    ...quizAttempts.map((q) => q.completedAt),
    ...pings.map((p) => p.recordedAt),
    ...savedPins.map((p) => p.createdAt),
    ...itineraryVotes.map((v) => v.createdAt),
    ...expenses.map((e) => e.spentAt),
    ...albumMedia.map((a) => a.createdAt),
  ];

  const weekdayBuckets = new Array(7).fill(0);
  const hourBuckets = new Array(24).fill(0);
  for (const t of activityTimestamps) {
    const { weekday, hour } = jerusalemWeekdayHour(t);
    weekdayBuckets[weekday]++;
    hourBuckets[hour]++;
  }
  const activityByWeekday = HEBREW_WEEKDAYS.map((label, i) => ({ day: label, events: weekdayBuckets[i] }));
  const activityByHour = hourBuckets.map((count, hour) => ({ hour: `${hour}:00`, events: count }));

  const months = lastMonthKeys(6);
  const signupsByMonthMap = new Map(months.map((m) => [m, 0]));
  for (const u of users) {
    const key = monthKey(u.createdAt);
    if (signupsByMonthMap.has(key)) signupsByMonthMap.set(key, signupsByMonthMap.get(key)! + 1);
  }
  const signupsByMonth = months.map((m) => ({ month: monthLabel(m), signups: signupsByMonthMap.get(m)! }));

  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;
  const countInRange = (timestamps: Date[], fromMs: number, toMs: number) =>
    timestamps.filter((t) => t.getTime() >= fromMs && t.getTime() < toMs).length;
  const last7 = countInRange(activityTimestamps, now - 7 * day, now);
  const prev7 = countInRange(activityTimestamps, now - 14 * day, now - 7 * day);
  const activityTrendPct = pctChange(last7, prev7);

  const signupsLast7 = countInRange(users.map((u) => u.createdAt), now - 7 * day, now);
  const signupsPrev7 = countInRange(users.map((u) => u.createdAt), now - 14 * day, now - 7 * day);
  const signupTrendPct = pctChange(signupsLast7, signupsPrev7);

  const categoryCounts = new Map<string, number>();
  for (const f of favorites) {
    const name = f.poi.category.name;
    categoryCounts.set(name, (categoryCounts.get(name) ?? 0) + 1);
  }
  const topCategories = [...categoryCounts.entries()]
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  const destCounts = new Map<string, number>();
  for (const q of quizAttempts) {
    destCounts.set(q.destination.name, (destCounts.get(q.destination.name) ?? 0) + 1);
  }

  // Which screens/features get the most activity — built from whichever
  // models actually carry a timestamp for the action they represent (not
  // every screen has one: TripLogistic/PackingCheck/PhrasebookProgress have
  // no createdAt field at all, so they can't be included honestly). מפה
  // covers both custom-pin saves and GPS location tracking, since both
  // happen on the map/now screens and neither is separately attributable.
  const screenBuckets: { screen: string; timestamps: Date[] }[] = [
    { screen: "מפה / מה עכשיו (מיקום)", timestamps: [...savedPins.map((p) => p.createdAt), ...pings.map((p) => p.recordedAt)] },
    { screen: "מועדפים", timestamps: favorites.map((f) => f.createdAt) },
    { screen: "מסלול (הצבעות)", timestamps: itineraryVotes.map((v) => v.createdAt) },
    { screen: "הוצאות", timestamps: expenses.map((e) => e.spentAt) },
    { screen: "חידונים", timestamps: quizAttempts.map((q) => q.completedAt) },
    { screen: "אלבום", timestamps: albumMedia.map((a) => a.createdAt) },
  ];
  const screenActivity = screenBuckets
    .map(({ screen, timestamps }) => ({
      screen,
      events: timestamps.length,
      trendPct: pctChange(countInRange(timestamps, now - 7 * day, now), countInRange(timestamps, now - 14 * day, now - 7 * day)),
    }))
    .sort((a, b) => b.events - a.events);

  return {
    signupsByMonth,
    activityByWeekday,
    activityByHour,
    activityTrendPct,
    signupTrendPct,
    signupsLast7,
    activityLast7: last7,
    topCategories,
    screenActivity,
    totalUsers: users.length,
  };
}

export type Recommendation = { icon: string; text: string };

/** Rule-based recommendations generated from the real aggregated numbers
 * above — every line here traces back to an actual query result, not a
 * canned/generic tip, so it stays honest as the underlying data changes. */
export function getMarketingRecommendations(financial: FinancialSummary, usage: UsageSummary): Recommendation[] {
  const recs: Recommendation[] = [];

  const totalPaid = financial.purchaseSource.reduce((s, p) => s + p.count, 0);
  if (totalPaid > 0) {
    const top = [...financial.purchaseSource].sort((a, b) => b.count - a.count)[0];
    const topPct = Math.round((top.count / totalPaid) * 100);
    if (top.source === "הפניית חבר" && topPct >= 25) {
      recs.push({ icon: "🤝", text: `${topPct}% מהרכישות מגיעות מהפניות חברים - כדאי לחזק את תוכנית ההפניות (בונוס גדול יותר, תזכורות למשתמשים פעילים לשתף).` });
    }
    if (top.source === "קוד קופון" && topPct >= 25) {
      recs.push({ icon: "🎟️", text: `${topPct}% מהרכישות מגיעות מקודי קופון - שיווק דרך שותפים/משפיענים עובד טוב, כדאי להרחיב את השותפויות האלה.` });
    }
    if (top.source === "ישיר" && topPct >= 70) {
      recs.push({ icon: "📣", text: `${topPct}% מהרכישות הן ישירות ללא קוד או הפניה - יש מקום להשקיע יותר בערוצי שיווק חדשים (קופונים, הפניות) כדי לגוון את מקורות ההכנסה.` });
    }
  }

  const activeScreens = usage.screenActivity.filter((s) => s.events > 0);
  if (activeScreens.length > 0) {
    const top = activeScreens[0];
    recs.push({ icon: "🔥", text: `המסך הכי פעיל הוא "${top.screen}" (${top.events} פעולות) - שווה להבליט אותו יותר בשיווק ובעמוד הנחיתה כשל-App עצמו.` });
    const leastActive = activeScreens[activeScreens.length - 1];
    if (activeScreens.length > 1 && leastActive.events < top.events * 0.1) {
      recs.push({ icon: "🧊", text: `המסך "${leastActive.screen}" כמעט ולא בשימוש (${leastActive.events} פעולות בלבד) - שווה לבדוק אם הוא נגיש/ברור מספיק למשתמשים, או להדגיש אותו יותר במדריך השימוש.` });
    }
  }

  if (financial.destinationTypeMix.length > 0) {
    const top = financial.destinationTypeMix[0];
    recs.push({ icon: "🌍", text: `היעדים המבוקשים ביותר לרכישה הם מסוג "${top.type}" (${top.count} רכישות) - כדאי להעמיק תוכן ושיווק ליעדים מהסוג הזה.` });
  }

  if (financial.revenueGrowthPct <= -10) {
    recs.push({ icon: "📉", text: `ההכנסה החודשית ירדה ב-${Math.abs(financial.revenueGrowthPct)}% לעומת החודש הקודם - שווה לבדוק קמפיין החזרה למשתמשים שפג מנוים.` });
  } else if (financial.revenueGrowthPct >= 15) {
    recs.push({ icon: "📈", text: `ההכנסה החודשית עלתה ב-${financial.revenueGrowthPct}% לעומת החודש הקודם - מגמה חיובית, כדאי לבדוק מה השתנה ולשכפל את זה.` });
  }

  const familyMix = financial.planMix.find((p) => p.plan.includes("משפחות"));
  const soloMix = financial.planMix.find((p) => p.plan.includes("בודד"));
  if (familyMix && soloMix && soloMix.count > 0 && familyMix.count / soloMix.count < 0.2) {
    recs.push({ icon: "👨‍👩‍👧", text: `חבילת המשפחות/נוודים מהווה רק חלק קטן מהמנויים הפעילים - כדאי לבדוק אם היתרונות שלה מודגשים מספיק בעמוד המחירים.` });
  }

  if (usage.signupTrendPct <= -15) {
    recs.push({ icon: "🪫", text: `הרשמות המשתמשים ירדו ב-${Math.abs(usage.signupTrendPct)}% בשבוע האחרון לעומת השבוע שלפניו - כדאי לבדוק את ערוצי הרכישה/פרסום הפעילים.` });
  } else if (usage.signupTrendPct >= 15) {
    recs.push({ icon: "🚀", text: `הרשמות המשתמשים עלו ב-${usage.signupTrendPct}% בשבוע האחרון - מגמה חיובית שכדאי לנצל עם דחיפה שיווקית נוספת.` });
  }

  if (usage.topCategories.length > 0) {
    const top = usage.topCategories[0];
    recs.push({ icon: "❤️", text: `הקטגוריה הפופולרית ביותר במועדפים היא "${top.category}" (${top.count} סימונים) - שווה להבליט אותה יותר במסך "מה עכשיו" ובתוכן השיווקי.` });
  }

  const peakHour = [...usage.activityByHour].sort((a, b) => b.events - a.events)[0];
  if (peakHour && peakHour.events > 0) {
    recs.push({ icon: "⏰", text: `שעת השיא בפעילות משתמשים היא סביב ${peakHour.hour} - זה זמן טוב לתזמן פוש-נוטיפיקציות או פרסום ברשתות חברתיות.` });
  }

  if (financial.compGrantCount > 0) {
    recs.push({ icon: "🎁", text: `יש כרגע ${financial.compGrantCount} מנויים שניתנו ידנית ע"י אדמין (לא הכנסה אמיתית) - לא נספרים בהכנסות אבל שווה לעקוב שהם לא צוברים היקף גדול מדי.` });
  }

  return recs;
}
