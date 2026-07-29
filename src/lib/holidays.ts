import Holidays from "date-holidays";
import { DESTINATION_COUNTRY_CODE } from "./countryCodes";

export type HolidayEntry = { date: string; name: string };

/**
 * Public holidays from an offline dataset (the `date-holidays` package) —
 * no live events/ticketing API is configured, so concerts and one-off events
 * aren't included here, only recurring national holidays.
 */
export function getUpcomingHolidays(slug: string, monthsAhead = 12): HolidayEntry[] {
  const countryCode = DESTINATION_COUNTRY_CODE[slug];
  if (!countryCode) return [];

  const hd = new Holidays(countryCode);
  const now = new Date();
  const currentYear = now.getFullYear();
  const raw = [...hd.getHolidays(currentYear), ...hd.getHolidays(currentYear + 1)];

  const cutoff = new Date(now.getTime() + monthsAhead * 30 * 24 * 60 * 60 * 1000);
  return raw
    .filter((h) => h.type === "public")
    .map((h) => ({ date: h.date.slice(0, 10), name: h.name }))
    .filter((h) => {
      const d = new Date(h.date);
      return d >= new Date(now.toDateString()) && d <= cutoff;
    })
    .sort((a, b) => a.date.localeCompare(b.date));
}
