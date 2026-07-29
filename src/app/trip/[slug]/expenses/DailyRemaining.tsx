"use client";

import { useMemo, useState } from "react";

export function DailyRemaining({
  dailyBudget,
  spentByDay,
}: {
  dailyBudget: number | null;
  spentByDay: { date: string; total: number; label: string }[];
}) {
  const todayKey = new Date().toISOString().slice(0, 10);
  const options = useMemo(() => {
    const hasToday = spentByDay.some((d) => d.date === todayKey);
    const list = hasToday
      ? spentByDay
      : [{ date: todayKey, total: 0, label: new Date(todayKey).toLocaleDateString("he-IL", { weekday: "long", day: "numeric", month: "long" }) }, ...spentByDay];
    return list.sort((a, b) => b.date.localeCompare(a.date));
  }, [spentByDay, todayKey]);

  const [selected, setSelected] = useState(todayKey);
  const selectedDay = options.find((o) => o.date === selected) ?? options[0];
  const remaining = dailyBudget !== null && selectedDay ? dailyBudget - selectedDay.total : null;

  return (
    <div>
      <label className="text-xs opacity-60">
        נשאר ליום:
        <select
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
          className="mt-1 block w-full rounded-lg border px-2 py-1 text-sm"
          style={{ borderColor: "var(--primary)" }}
        >
          {options.map((o) => (
            <option key={o.date} value={o.date}>
              {o.label}
            </option>
          ))}
        </select>
      </label>
      <div className="mt-1 text-lg font-extrabold" style={{ color: remaining !== null && remaining < 0 ? "#DC2626" : "var(--primary)" }}>
        {remaining !== null ? `$${remaining.toFixed(0)}` : "—"}
      </div>
    </div>
  );
}
