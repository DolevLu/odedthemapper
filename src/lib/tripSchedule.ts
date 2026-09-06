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
