function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/** Which itinerary dayIndex (1-based) is "today", given this user's own
 * logistics rows for the destination — day 1 is the calendar date of the
 * earliest logistic's start, and every day after counts real calendar days
 * from there. Returns null when there's no trip-start date, or when today
 * falls outside the trip's span (before it starts, or after the last
 * logistic's end) — callers should then treat NOTHING as "today" rather
 * than guessing.
 *
 * Single source of truth for "is this itinerary day actually happening
 * right now": the Now screen's current-stop card and the itinerary's own
 * current/next highlighting both need to agree on this, rather than one of
 * them merely checking whether a stop's time-of-day resembles the current
 * clock time regardless of which day (or which month) it's on. */
export function resolveTodayDayIndex(logistics: { startsAt: Date | null; endsAt: Date | null }[]): number | null {
  const withStart = logistics.filter((l): l is { startsAt: Date; endsAt: Date | null } => l.startsAt !== null);
  if (withStart.length === 0) return null;

  const sorted = [...withStart].sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
  const tripStart = startOfDay(sorted[0].startsAt);
  const last = sorted[sorted.length - 1];
  const tripEnd = startOfDay(last.endsAt ?? last.startsAt);

  const today = startOfDay(new Date());
  if (today < tripStart || today > tripEnd) return null;

  return Math.round((today.getTime() - tripStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;
}

/** Which itinerary dayIndex is "today" when the traveler has set explicit
 * per-day dates directly (see setItineraryDayDate) — takes priority over
 * the TripLogistic-derived guess in resolveTodayDayIndex, since stating
 * "this day is the 15th" outright is more reliable than inferring it from
 * a flight/hotel entry that may not exist, may not match a gapless
 * day-by-day itinerary, or may simply be wrong for a specific day (a rest
 * day, a schedule change). Only days with a date actually set participate;
 * an itinerary with none set at all defers entirely to the logistics guess. */
export function resolveTodayDayIndexFromDates(days: { dayIndex: number; date: Date | null }[]): number | null {
  const today = startOfDay(new Date()).getTime();
  const match = days.find((d) => d.date && startOfDay(d.date).getTime() === today);
  return match?.dayIndex ?? null;
}

/** Which itinerary day the "מה עכשיו"/current-stop UI should treat as
 * "today": an explicit per-day date match first, else the calendar-accurate
 * resolveTodayDayIndex, else the itinerary's own earliest day. The whole
 * point of "what's happening now" is to always surface something from the
 * traveler's real itinerary — going blank just because no flight/hotel date
 * was entered, or because the trip's dates don't happen to straddle today,
 * defeats that, so this falls back to day 1 rather than showing nothing.
 * Pass every existing dayIndex, ascending. */
export function resolveEffectiveTodayDayIndex(
  logistics: { startsAt: Date | null; endsAt: Date | null }[],
  dayIndexesAscending: number[],
  daysWithDates: { dayIndex: number; date: Date | null }[] = []
): number | null {
  if (daysWithDates.some((d) => d.date)) return resolveTodayDayIndexFromDates(daysWithDates);
  return resolveTodayDayIndex(logistics) ?? dayIndexesAscending[0] ?? null;
}
