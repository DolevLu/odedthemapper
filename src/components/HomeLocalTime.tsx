"use client";

import { useEffect, useState } from "react";
import { DESTINATION_FACTS } from "@/lib/destinationFacts";

const HOME_TIMEZONE = "Asia/Jerusalem";

function formatTime(tz: string, now: Date): string {
  return new Intl.DateTimeFormat("he-IL", { hour: "2-digit", minute: "2-digit", timeZone: tz }).format(now);
}

/** UTC offset in minutes for a timezone at a given moment (DST-aware) — used
 * only to show "±N שעות" next to the clocks, not for the clocks themselves
 * (Intl.DateTimeFormat already handles those directly). */
function offsetMinutes(tz: string, now: Date): number {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: tz, timeZoneName: "shortOffset" }).formatToParts(now);
  const raw = parts.find((p) => p.type === "timeZoneName")?.value ?? "GMT+0";
  const match = raw.match(/GMT([+-]\d+)(?::(\d+))?/);
  if (!match) return 0;
  const hours = Number(match[1]);
  const minutes = match[2] ? Number(match[2]) : 0;
  return hours * 60 + (hours < 0 ? -minutes : minutes);
}

/** Home vs. local time side by side on the Now screen — started only after
 * mount (client-only "now") so server/client renders always match; ticks
 * once a minute, which is plenty for a clock display. */
export function HomeLocalTime({ slug }: { slug: string }) {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  const facts = DESTINATION_FACTS[slug];
  if (!now || !facts) return null;

  const diffHours = Math.round((offsetMinutes(facts.timezone, now) - offsetMinutes(HOME_TIMEZONE, now)) / 60);

  return (
    <div
      className="flex items-center justify-center gap-4 rounded-xl border px-4 py-2.5 text-sm"
      style={{ borderColor: "color-mix(in srgb, var(--primary) 20%, transparent)", background: "var(--surface)" }}
    >
      <div className="flex flex-col items-center">
        <span className="text-xs opacity-50">🏠 אצלכם בבית</span>
        <span className="text-lg font-bold">{formatTime(HOME_TIMEZONE, now)}</span>
      </div>
      <span className="text-lg opacity-20">|</span>
      <div className="flex flex-col items-center">
        <span className="text-xs opacity-50">📍 שעה מקומית</span>
        <span className="text-lg font-bold" style={{ color: "var(--primary)" }}>
          {formatTime(facts.timezone, now)}
        </span>
      </div>
      {diffHours !== 0 && (
        <span className="text-xs opacity-50">
          ({diffHours > 0 ? "+" : ""}
          {diffHours} שעות)
        </span>
      )}
    </div>
  );
}
