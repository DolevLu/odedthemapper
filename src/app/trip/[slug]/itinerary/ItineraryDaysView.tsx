"use client";

import { useState } from "react";
import { colorForDay } from "@/lib/geo";
import { AddItemToDay } from "./AddItemToDay";
import { DayItemsList, type DayListItem } from "./DayItemsList";

type Day = { id: string; dayIndex: number; items: DayListItem[] };
type PoiOption = { id: string; name: string; areaName: string; categoryName: string };

export function ItineraryDaysView({
  days,
  slug,
  poiOptions,
  path = "itinerary",
}: {
  days: Day[];
  slug: string;
  poiOptions: PoiOption[];
  path?: string;
}) {
  const [mode, setMode] = useState<"grid" | "focused">("grid");
  const [focusedIndex, setFocusedIndex] = useState(0);

  if (days.length === 0) return null;

  const clampedIndex = Math.min(focusedIndex, days.length - 1);
  const focusedDay = days[clampedIndex];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end gap-1">
        <button
          onClick={() => setMode("grid")}
          className="rounded-full border px-3 py-1 text-xs font-semibold"
          style={{
            borderColor: "var(--primary)",
            background: mode === "grid" ? "var(--primary)" : "transparent",
            color: mode === "grid" ? "white" : "var(--text)",
          }}
        >
          ▦ כל הימים
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
          📖 תצוגת יום
        </button>
      </div>

      {mode === "grid" ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {days.map((day) => (
            <DayCard key={day.id} day={day} slug={slug} poiOptions={poiOptions} path={path} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-3 border-b pb-3" style={{ borderColor: "color-mix(in srgb, var(--primary) 20%, transparent)" }}>
            <button
              onClick={() => setFocusedIndex((i) => Math.max(0, i - 1))}
              disabled={clampedIndex === 0}
              className="flex h-9 w-9 items-center justify-center rounded-full border text-lg disabled:opacity-30"
              style={{ borderColor: "var(--primary)" }}
            >
              ‹
            </button>
            <div className="text-center">
              <p className="text-xs opacity-60">
                יום {clampedIndex + 1} מתוך {days.length}
              </p>
              <p className="text-xl font-extrabold" style={{ fontFamily: "var(--font-heading)", color: colorForDay(clampedIndex) }}>
                יום {focusedDay.dayIndex}
              </p>
            </div>
            <button
              onClick={() => setFocusedIndex((i) => Math.min(days.length - 1, i + 1))}
              disabled={clampedIndex === days.length - 1}
              className="flex h-9 w-9 items-center justify-center rounded-full border text-lg disabled:opacity-30"
              style={{ borderColor: "var(--primary)" }}
            >
              ›
            </button>
          </div>
          <DayCard day={focusedDay} slug={slug} poiOptions={poiOptions} path={path} large />
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
  large,
}: {
  day: Day;
  slug: string;
  poiOptions: PoiOption[];
  path: string;
  large?: boolean;
}) {
  const color = colorForDay(day.dayIndex - 1);
  return (
    <div
      className="flex flex-col gap-3 overflow-hidden border"
      style={{ borderRadius: "var(--radius)", borderColor: color, borderWidth: 2, background: "var(--surface)" }}
    >
      <div className={`flex items-center gap-2 px-4 pt-4 ${large ? "" : ""}`}>
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white" style={{ background: color }}>
          {day.dayIndex}
        </span>
        <h2 className="font-bold">יום {day.dayIndex}</h2>
      </div>

      <div className="flex flex-col gap-3 px-4 pb-4">
        <DayItemsList dayId={day.id} slug={slug} path={path} items={day.items} />
        <AddItemToDay dayId={day.id} slug={slug} pois={poiOptions} />
      </div>
    </div>
  );
}
