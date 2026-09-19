"use client";

import { useOptimistic, useState } from "react";
import { colorForDay } from "@/lib/geo";
import { deleteItineraryDay, setItineraryDayDate } from "@/lib/actions/trip";
import { AddItemToDay } from "./AddItemToDay";
import { DayItemsList, type DayListItem } from "./DayItemsList";
import { useTranslation } from "@/components/i18n/LanguageContext";
import type { Lang } from "@/lib/i18n/dictionary";

type Day = { id: string; dayIndex: number; date: string | null; items: DayListItem[] };

// Short form ("15 בספט׳" / "15 Sep") — enough to tell days apart at a glance
// next to "Day N" without repeating the year (a trip is never a year long).
function formatDayDate(dateStr: string, lang: Lang): string {
  return new Date(`${dateStr}T00:00:00Z`).toLocaleDateString(lang === "en" ? "en-GB" : "he-IL", { day: "numeric", month: "short", timeZone: "UTC" });
}
type PoiOption = { id: string; name: string; areaName: string; categoryName: string };

export function ItineraryDaysView({
  days,
  slug,
  poiOptions,
  path = "itinerary",
  focusedDayIndex: controlledFocusedDayIndex,
  onFocusedDayIndexChange,
  hideHeader = false,
  extraAction,
  todayDayIndex = null,
}: {
  days: Day[];
  slug: string;
  poiOptions: PoiOption[];
  path?: string;
  /** Controlled day selection (a dayIndex value, not an array position) —
   * used by the mobile full-screen layout to keep the map and the drawer's
   * list in sync. Falls back to internal state when omitted. */
  focusedDayIndex?: number;
  onFocusedDayIndexChange?: (dayIndex: number) => void;
  /** Skips the built-in switcher/mode-toggle header — the mobile drawer
   * renders its own (shared with the map above it) instead. */
  hideHeader?: boolean;
  /** Rendered on the opposite side of the grid/focused toggle row — desktop
   * puts "+ הוספת יום" here instead of its own action row, so the row of
   * pills above doesn't have to fit it too. */
  extraAction?: React.ReactNode;
  /** Which dayIndex is actually today's real calendar date (see
   * resolveTodayDayIndex) — null when there's no trip-start date or today
   * falls outside the trip's span. Passed down to gate DayItemsList's
   * current/next highlighting so it only ever lights up on the one day
   * that's genuinely happening right now. */
  todayDayIndex?: number | null;
}) {
  // Defaults to the single-day focused view everywhere (desktop pairs it
  // side-by-side with the route map; mobile pairs it with the route map
  // stacked underneath) — planning one day at a time next to its route
  // reads far better than a wall of day cards on any screen size. A manual
  // toggle to "all days" is still one tap away.
  const [mode, setMode] = useState<"grid" | "focused">("focused");
  const [internalFocusedIndex, setInternalFocusedIndex] = useState(0);
  const { t, lang } = useTranslation();

  function handleDateMoved(dayIndex: number) {
    onFocusedDayIndexChange?.(dayIndex);
    setInternalFocusedIndex(dayIndex - 1);
  }

  if (days.length === 0) return null;

  const controlledArrayIndex =
    controlledFocusedDayIndex !== undefined ? days.findIndex((d) => d.dayIndex === controlledFocusedDayIndex) : -1;
  const rawIndex = controlledArrayIndex >= 0 ? controlledArrayIndex : internalFocusedIndex;
  const clampedIndex = Math.min(Math.max(rawIndex, 0), days.length - 1);
  const focusedDay = days[clampedIndex];

  function goToIndex(next: number) {
    if (onFocusedDayIndexChange) onFocusedDayIndexChange(days[next].dayIndex);
    else setInternalFocusedIndex(next);
  }

  if (hideHeader) {
    return (
      <DayCard day={focusedDay} slug={slug} poiOptions={poiOptions} path={path} isToday={focusedDay.dayIndex === todayDayIndex} large onDateMoved={handleDateMoved} />
    );
  }

  return (
    // No lg: gating here — this branch (hideHeader=false) only ever renders
    // from the desktop ItineraryLayoutSwitcher, which already gates entry at
    // useIsDesktop's 640px breakpoint; an lg: (1024px) prefix left a real
    // gap between 640-1023px where the outer layout was full-height but this
    // component's own height-fitting classes hadn't kicked in yet.
    <div className="flex h-full min-h-0 flex-col gap-4">
      <div className={`flex items-center gap-1 ${extraAction ? "justify-between" : "justify-end"}`}>
        {extraAction}
        <div className="flex gap-1">
        <button
          onClick={() => setMode("grid")}
          className="rounded-full border px-3 py-1 text-xs font-semibold"
          style={{
            borderColor: "var(--primary)",
            background: mode === "grid" ? "var(--primary)" : "transparent",
            color: mode === "grid" ? "white" : "var(--text)",
          }}
        >
          {t("daysView.allDays")}
        </button>
        <button
          onClick={() => setMode("focused")}
          className="rounded-full border px-3 py-1 text-xs font-semibold"
          style={{
            borderColor: "var(--primary)",
            background: mode === "focused" ? "var(--primary)" : "transparent",
            color: mode === "focused" ? "white" : "var(--text)",
          }}
        >
          {t("daysView.dayView")}
        </button>
        </div>
      </div>

      {mode === "grid" ? (
        <div className="grid grid-cols-2 gap-4">
          {days.map((day) => (
            <DayCard key={day.id} day={day} slug={slug} poiOptions={poiOptions} path={path} isToday={day.dayIndex === todayDayIndex} />
          ))}
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col gap-4">
          <div className="flex items-center justify-between gap-3 border-b pb-3" style={{ borderColor: "color-mix(in srgb, var(--primary) 20%, transparent)" }}>
            <button
              onClick={() => goToIndex(Math.max(0, clampedIndex - 1))}
              disabled={clampedIndex === 0}
              className="flex h-9 w-9 items-center justify-center rounded-full border text-lg disabled:opacity-30"
              style={{ borderColor: "var(--primary)" }}
            >
              ‹
            </button>
            <div className="text-center">
              <p className="text-xs opacity-60">
                {t("daysView.dayLabel")} {clampedIndex + 1} {t("daysView.ofDays")} {days.length}
                {focusedDay.date ? ` · ${formatDayDate(focusedDay.date, lang)}` : ""}
              </p>
              <p className="text-xl font-extrabold" style={{ fontFamily: "var(--font-heading)", color: colorForDay(clampedIndex) }}>
                {t("daysView.dayLabel")} {focusedDay.dayIndex}
              </p>
            </div>
            <button
              onClick={() => goToIndex(Math.min(days.length - 1, clampedIndex + 1))}
              disabled={clampedIndex === days.length - 1}
              className="flex h-9 w-9 items-center justify-center rounded-full border text-lg disabled:opacity-30"
              style={{ borderColor: "var(--primary)" }}
            >
              ›
            </button>
          </div>
          {/* Independently scrollable on desktop so a long day's stop list
           * doesn't push this column taller than the route map beside it. */}
          <div className="min-h-0 flex-1 overflow-y-auto pe-1">
            <DayCard day={focusedDay} slug={slug} poiOptions={poiOptions} path={path} isToday={focusedDay.dayIndex === todayDayIndex} large onDateMoved={handleDateMoved} />
          </div>
        </div>
      )}
    </div>
  );
}

function DayCard({
  day,
  slug,
  poiOptions,
  path,
  isToday = false,
  large,
  onDateMoved,
}: {
  day: Day;
  slug: string;
  poiOptions: PoiOption[];
  path: string;
  isToday?: boolean;
  large?: boolean;
  /** Called with the day's new number after a date change re-sorted the days. */
  onDateMoved?: (dayIndex: number) => void;
}) {
  const color = colorForDay(day.dayIndex - 1);
  // Tracked locally rather than bound straight to the day.date prop — that
  // prop only updates once setItineraryDayDate's own revalidatePath lands,
  // which reset the date picker out from under whoever was still using it
  // (same bug, same fix as DayItemsList's time input — see its own comment).
  const [localDate, setLocalDate] = useState(day.date ?? "");
  const { t } = useTranslation();
  const [shownItems, addOptimisticItem] = useOptimistic(day.items, (state: DayListItem[], item: DayListItem) => [...state, item]);

  function handleDelete() {
    if (!window.confirm(`${t("daysView.confirmDeleteDayPrefix")} ${day.dayIndex} ${t("daysView.confirmDeleteDaySuffix")}`)) return;
    deleteItineraryDay(day.id, slug, path);
  }

  function handleDateChange(value: string) {
    setLocalDate(value);
    setItineraryDayDate(day.id, value, slug).then((r) => r && onDateMoved?.(r.dayIndex));
  }

  return (
    <div
      className={`game-pop-in group flex flex-col gap-3 overflow-hidden border transition-transform duration-200 ${large ? "" : "hover:-translate-y-1 hover:rotate-[-0.3deg] hover:shadow-md"}`}
      style={{
        borderRadius: "var(--radius)",
        borderColor: `color-mix(in srgb, ${color} 35%, transparent)`,
        borderWidth: 1,
        background: "var(--surface)",
      }}
    >
      <div className={`flex items-center gap-2 px-4 pt-4 ${large ? "" : ""}`}>
        <span
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6"
          style={{ background: color }}
        >
          {day.dayIndex}
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="font-bold">{t("daysView.dayLabel")} {day.dayIndex}</h2>
          <label className="flex items-center gap-1 text-xs opacity-60 hover:opacity-100">
            📅
            <input
              type="date"
              value={localDate}
              onChange={(e) => handleDateChange(e.target.value)}
              className="bg-transparent outline-none [color-scheme:light]"
              style={{ fontFamily: "inherit" }}
            />
          </label>
        </div>
        <button
          onClick={handleDelete}
          className="shrink-0 rounded-full px-2 py-1 text-sm opacity-50 hover:opacity-100"
          title={t("daysView.deleteDay")}
          aria-label={t("daysView.deleteDay")}
        >
          🗑️
        </button>
      </div>

      <div className="flex flex-col gap-3 px-4 pb-4">
        <DayItemsList dayId={day.id} slug={slug} path={path} items={shownItems} isToday={isToday} />
        <AddItemToDay dayId={day.id} slug={slug} pois={poiOptions} onOptimisticAdd={addOptimisticItem} />
      </div>
    </div>
  );
}
