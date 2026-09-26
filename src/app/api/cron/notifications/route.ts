import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendPushToUser } from "@/lib/push";
import { buildDailyPush } from "@/lib/dailyPush";
import { resolveTodayDayIndex, resolveTodayDayIndexFromDates } from "@/lib/tripSchedule";

// Most airlines open online check-in 24-48h before departure — 24h is a
// conservative window that still lands well inside that range for almost
// every carrier. Checked once daily (see vercel.json) rather than hourly:
// Vercel's Hobby plan caps cron jobs at once/day, and daily is plenty given
// the 24h window and the once-per-day budget-alert cap below.
const CHECKIN_WINDOW_HOURS = 24;
const BUDGET_ALERT_THRESHOLD = 0.9;

function todayStart(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Daily cron target (see vercel.json) — sends two kinds of push
 * notifications: flight check-in reminders (TripLogistic.startsAt inside the
 * next 24h, never sent twice thanks to checkinNotifiedAt) and budget alerts
 * (spending crossed 90% of TripBudget.totalCents, at most once per day
 * thanks to lastAlertedAt). Requires web push to actually be configured
 * (VAPID env vars) — sendPushToUser silently no-ops otherwise, so this
 * route still runs and marks things notified even before push is wired up
 * in a given environment, which is fine since there's nothing to deliver.
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const checkinWindowEnd = new Date(now.getTime() + CHECKIN_WINDOW_HOURS * 60 * 60 * 1000);

  const flights = await prisma.tripLogistic.findMany({
    where: { type: "flight", startsAt: { gte: now, lte: checkinWindowEnd }, checkinNotifiedAt: null },
    include: { destination: { select: { name: true, slug: true } } },
  });

  for (const flight of flights) {
    let flightTitle = "הטיסה שלכם";
    try {
      const details = JSON.parse(flight.detailsJson) as { title?: string };
      if (details.title) flightTitle = details.title;
    } catch {
      // ignore malformed JSON — fall back to the generic title above
    }
    await sendPushToUser(flight.userId, {
      title: "✈️ הצ׳ק-אין לטיסה שלכם נפתח",
      body: `${flightTitle} ל${flight.destination.name} ממריאה בקרוב - זמן להיכנס לצ׳ק-אין.`,
      url: `/trip/${flight.destination.slug}/logistics`,
    });
    await prisma.tripLogistic.update({ where: { id: flight.id }, data: { checkinNotifiedAt: now } });
  }

  const budgets = await prisma.tripBudget.findMany({
    where: { OR: [{ lastAlertedAt: null }, { lastAlertedAt: { lt: todayStart() } }] },
    include: { destination: { select: { name: true, slug: true } } },
  });

  let budgetsAlerted = 0;
  for (const budget of budgets) {
    if (budget.totalCents <= 0) continue;
    const spent = await prisma.expense.aggregate({
      where: { userId: budget.userId, destinationId: budget.destinationId },
      _sum: { amountCents: true },
    });
    const spentCents = spent._sum.amountCents ?? 0;
    const ratio = spentCents / budget.totalCents;
    if (ratio < BUDGET_ALERT_THRESHOLD) continue;

    const pct = Math.round(ratio * 100);
    await sendPushToUser(budget.userId, {
      title: pct >= 100 ? "⚠️ חרגתם מהתקציב" : "💸 מתקרבים לתקציב",
      body: `הוצאתם כבר ${pct}% מהתקציב ל${budget.destination.name}.`,
      url: `/trip/${budget.destination.slug}/expenses`,
    });
    await prisma.tripBudget.update({ where: { id: budget.id }, data: { lastAlertedAt: now } });
    budgetsAlerted++;
  }

  // "Your day starts" reminder — only for a day that genuinely resolves to
  // today via a real date (an explicit ItineraryDay.date or a TripLogistic
  // date range), never the "מה עכשיו" screen's own fallback-to-day-1
  // behavior (resolveEffectiveTodayDayIndex) — that fallback exists so the
  // Now screen always shows *something* even with zero real dates set, but
  // reusing it here would make day 1 "today" forever for every itinerary
  // that never set any dates, which would fire this once for literally
  // every such itinerary in the system and then never again (since day 1
  // never stops being "today").
  const personalItineraries = await prisma.itinerary.findMany({
    where: { kind: "personal" },
    include: {
      destination: { select: { name: true, slug: true } },
      days: { orderBy: { dayIndex: "asc" }, include: { items: { select: { id: true } } } },
    },
  });
  const logisticsByUserDest = new Map<string, { startsAt: Date | null; endsAt: Date | null }[]>();
  const allLogistics = await prisma.tripLogistic.findMany({ select: { userId: true, destinationId: true, startsAt: true, endsAt: true } });
  for (const l of allLogistics) {
    const key = `${l.userId}:${l.destinationId}`;
    const list = logisticsByUserDest.get(key) ?? [];
    list.push({ startsAt: l.startsAt, endsAt: l.endsAt });
    logisticsByUserDest.set(key, list);
  }

  let dayStartsNotified = 0;
  for (const itinerary of personalItineraries) {
    if (itinerary.days.length === 0) continue;
    const daysWithDates = itinerary.days.map((d) => ({ dayIndex: d.dayIndex, date: d.date }));
    const logistics = logisticsByUserDest.get(`${itinerary.userId}:${itinerary.destinationId}`) ?? [];
    const todayDayIndex = daysWithDates.some((d) => d.date) ? resolveTodayDayIndexFromDates(daysWithDates) : resolveTodayDayIndex(logistics);
    if (todayDayIndex == null) continue;

    const today = itinerary.days.find((d) => d.dayIndex === todayDayIndex);
    if (!today || today.items.length === 0 || today.dayStartNotifiedAt) continue;

    await sendPushToUser(itinerary.userId, {
      title: `📍 יום ${today.dayIndex} מתחיל`,
      body: `${today.items.length} נקודות מתוכננות היום ב${itinerary.destination.name}. בואו נראה את המסלול.`,
      url: `/trip/${itinerary.destination.slug}/now`,
    });
    await prisma.itineraryDay.update({ where: { id: today.id }, data: { dayStartNotifiedAt: now } });
    dayStartsNotified++;
  }

  // The daily push: everyone with notifications on gets at least one a day. This runs last, so anyone who already
  // got a specific push above (check-in, budget alert, "your day starts") is skipped via lastPushAt - never two.
  const dailyCutoff = new Date(now.getTime() - 18 * 60 * 60 * 1000);
  const dailyCandidates = await prisma.user.findMany({
    where: {
      notificationsEnabled: true,
      OR: [{ pushSubscriptions: { some: {} } }, { deviceTokens: { some: {} } }],
      AND: [{ OR: [{ lastPushAt: null }, { lastPushAt: { lt: dailyCutoff } }] }],
    },
    select: { id: true },
  });
  let dailySent = 0;
  for (const user of dailyCandidates) {
    const message = await buildDailyPush(user.id, now);
    if ((await sendPushToUser(user.id, message)) > 0) dailySent++;
  }

  return NextResponse.json({
    ok: true,
    flightsNotified: flights.length,
    budgetsAlerted,
    dayStartsNotified,
    dailyPushesSent: dailySent,
  });
}
