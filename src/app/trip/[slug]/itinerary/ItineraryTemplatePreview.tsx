"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { applyItineraryTemplate, type TemplatePreview } from "@/lib/actions/trip";
import { DayRouteMap, type MapDay } from "@/components/map/DayRouteMap";
import { colorForDay } from "@/lib/geo";

/** Read-only view of a saved route — reached by clicking a saved route in
 * "📂 שמורים" (see ItineraryTopBar), which now just shows it instead of
 * immediately overwriting the active itinerary like it used to. Deliberately
 * NOT the editable ItineraryDaysView/ItineraryMobileView (no drag, vote,
 * delete, add-item) — this is a look, not a workspace; "✅ השתמשו במסלול
 * הזה" below is the one explicit action that turns it into a real edit. */
export function ItineraryTemplatePreview({
  slug,
  destinationId,
  templateId,
  preview,
  hasExistingDays,
}: {
  slug: string;
  destinationId: string;
  templateId: string;
  preview: TemplatePreview;
  hasExistingDays: boolean;
}) {
  const router = useRouter();
  const [applying, setApplying] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [, startTransition] = useTransition();

  const mapDays: MapDay[] = preview.days.map((day) => ({
    dayIndex: day.dayIndex,
    points: day.items
      .filter((i) => Number.isFinite(i.lat) && Number.isFinite(i.lng))
      .map((i) => ({ id: i.id, name: i.name, lat: i.lat, lng: i.lng, description: i.description, photoUrl: i.photoUrl, timeOfDay: i.timeOfDay })),
  }));

  function applyNow() {
    setApplying(true);
    startTransition(async () => {
      await applyItineraryTemplate(templateId, destinationId, slug, "personal");
      router.push(`/trip/${slug}/itinerary`);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div
        className="flex flex-wrap items-center justify-between gap-3 border p-3"
        style={{ borderRadius: "var(--radius)", borderColor: "var(--primary)", background: "color-mix(in srgb, var(--primary) 8%, var(--surface))" }}
      >
        <p className="text-sm font-semibold">
          📂 צופים במסלול השמור: <span style={{ color: "var(--primary)" }}>{preview.name}</span>
        </p>
        <div className="flex shrink-0 items-center gap-2">
          {confirming ? (
            <>
              <span className="text-xs opacity-70">{hasExistingDays ? "זה יחליף את המסלול הפעיל שלכם - להמשיך?" : "להשתמש במסלול הזה?"}</span>
              <button onClick={applyNow} disabled={applying} className="rounded-full px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50" style={{ background: "var(--primary)" }}>
                {applying ? "מיישם…" : "אישור"}
              </button>
              <button onClick={() => setConfirming(false)} className="text-xs font-semibold opacity-60">
                ביטול
              </button>
            </>
          ) : (
            <button onClick={() => setConfirming(true)} className="rounded-full px-3 py-1.5 text-xs font-semibold text-white" style={{ background: "var(--primary)" }}>
              ✅ השתמשו במסלול הזה
            </button>
          )}
          <Link href={`/trip/${slug}/itinerary`} className="rounded-full border px-3 py-1.5 text-xs font-semibold" style={{ borderColor: "var(--primary)", color: "var(--primary)" }}>
            ✕ חזרה למסלול הפעיל
          </Link>
        </div>
      </div>

      <div className="flex flex-col gap-6 lg:h-[calc(100vh-260px)] lg:min-h-[420px] lg:flex-row lg:items-stretch">
        <div className="flex flex-col gap-4 lg:min-h-0 lg:w-[420px] lg:shrink-0 lg:overflow-y-auto">
          {preview.days.map((day) => (
            <div key={day.dayIndex}>
              <p className="mb-2 text-sm font-extrabold" style={{ color: colorForDay(day.dayIndex - 1) }}>
                יום {day.dayIndex}
              </p>
              <div className="flex flex-col gap-1.5">
                {day.items.map((item) => (
                  <div key={item.id} className="flex items-center gap-2 border p-2 text-sm" style={{ borderRadius: "var(--radius)", borderColor: "color-mix(in srgb, var(--primary) 20%, transparent)" }}>
                    {item.timeOfDay && <span className="shrink-0 font-mono text-xs font-bold" style={{ color: "var(--primary)" }}>{item.timeOfDay}</span>}
                    <span className="truncate">{item.name}</span>
                  </div>
                ))}
                {day.items.length === 0 && <p className="text-xs opacity-40">יום ריק</p>}
              </div>
            </div>
          ))}
        </div>

        {mapDays.some((d) => d.points.length > 0) && (
          <div className="lg:min-h-0 lg:flex-1">
            <DayRouteMap days={mapDays} fillHeight />
          </div>
        )}
      </div>
    </div>
  );
}
