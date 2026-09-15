"use client";

import { useMemo, useState } from "react";
import { useTranslation } from "@/components/i18n/LanguageContext";

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
    <div>
      <label className="text-[10px] opacity-60 sm:text-xs">
        {t("expenses.remainingToday")}
        <select
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
          className="mt-1 block w-full rounded-lg border px-1.5 py-1 text-xs sm:px-2 sm:text-sm"
          style={{ borderColor: "var(--primary)" }}
        >
          {options.map((o) => (
            <option key={o.date} value={o.date}>
              {o.label}
            </option>
          ))}
        </select>
      </label>
      <div className="mt-1 text-sm font-extrabold sm:text-lg" style={{ color: remaining !== null && remaining < 0 ? "#DC2626" : "var(--primary)" }}>
        {remaining !== null ? `₪${remaining.toFixed(0)}` : "—"}
      </div>
    </div>
  );
}
