"use client";

import { useMemo, useState } from "react";
import { useTranslation } from "@/components/i18n/LanguageContext";

/** "What's left for the day" as one compact row: pick a day, see what remains of the daily allowance. */
export function DailyRemaining({
  dailyBudget,
  spentByDay,
}: {
  dailyBudget: number | null;
  spentByDay: { date: string; total: number; label: string }[];
}) {
  const { t, lang } = useTranslation();
  const dateLocale = lang === "en" ? "en-GB" : "he-IL";
  const todayKey = new Date().toISOString().slice(0, 10);
  const options = useMemo(() => {
    const hasToday = spentByDay.some((d) => d.date === todayKey);
    const list = hasToday
      ? spentByDay
      : [{ date: todayKey, total: 0, label: new Date(todayKey).toLocaleDateString(dateLocale, { weekday: "long", day: "numeric", month: "long" }) }, ...spentByDay];
    return list.sort((a, b) => b.date.localeCompare(a.date));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spentByDay, todayKey]);

  const [selected, setSelected] = useState(todayKey);
  const selectedDay = options.find((o) => o.date === selected) ?? options[0];
  const remaining = dailyBudget !== null && selectedDay ? dailyBudget - selectedDay.total : null;

  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border px-4 py-3" style={{ borderColor: "color-mix(in srgb, var(--primary) 18%, transparent)", background: "var(--surface)" }}>
      <div className="min-w-0">
        <p className="text-xs opacity-60">{t("expenses.remainingToday")}</p>
        <select
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
          className="mt-0.5 max-w-full bg-transparent text-sm font-semibold"
          aria-label={t("expenses.remainingToday")}
        >
          {options.map((o) => (
            <option key={o.date} value={o.date}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
      <div className="shrink-0 text-2xl font-extrabold tabular-nums" style={{ color: remaining !== null && remaining < 0 ? "#DC2626" : "var(--primary)" }}>
        {remaining !== null ? `₪${remaining.toFixed(0)}` : "—"}
      </div>
    </div>
  );
}
