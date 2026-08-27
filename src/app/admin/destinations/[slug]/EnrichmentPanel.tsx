"use client";

import { useState } from "react";
import { enrichDestinationPoisBatch } from "@/lib/actions/admin";

/** Drives the batch enrichment loop client-side — each server call only
 * processes a handful of POIs (bounded, safely inside the page's 60s
 * maxDuration) and returns how many are left; this keeps calling it again
 * until none remain, so "one button" really does mean "enrich the whole
 * destination" without risking a single request running for many minutes. */
export function EnrichmentPanel({
  destinationId,
  slug,
  initialTotal,
  initialRemaining,
}: {
  destinationId: string;
  slug: string;
  initialTotal: number;
  initialRemaining: number;
}) {
  const [total, setTotal] = useState(initialTotal);
  const [remaining, setRemaining] = useState(initialRemaining);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function runLoop() {
    setRunning(true);
    setError(null);
    try {
      let stillRemaining = remaining;
      while (stillRemaining > 0) {
        const result = await enrichDestinationPoisBatch(destinationId, slug);
        setTotal(result.total);
        setRemaining(result.remaining);
        stillRemaining = result.remaining;
        if (result.processedInBatch === 0) break; // safety valve against an infinite loop
      }
    } catch {
      setError("קרתה שגיאה באמצע ההעשרה - אפשר ללחוץ שוב כדי להמשיך מאיפה שנעצר.");
    } finally {
      setRunning(false);
    }
  }

  const done = total - remaining;
  const pct = total > 0 ? Math.round((done / total) * 100) : 100;

  return (
    <section className="rounded-xl border border-black/10 bg-white p-5">
      <h2 className="mb-1 font-bold">✨ העשרת מידע מה-AI</h2>
      <p className="mb-3 text-sm opacity-60">
        לכל נקודה שחסר לה תמונה אמיתית / תיאור אמיתי / קישור לאתר - או שהתיאור/התמונה גנריים (חוזרים על אותו תוכן בהרבה
        נקודות, סימן לקובץ KML שנוצר אוטומטית) - הכפתור מחפש תמונה אמיתית בוויקיפדיה, ותיאור וקישור אמיתיים דרך AI עם
        חיפוש גוגל חי. לא נוגע בנקודות שכבר יש להן תוכן אמיתי וייחודי. יכול לקחת כמה דקות לפי גודל היעד.
      </p>

      {total === 0 ? (
        <p className="text-sm opacity-50">עדיין אין נקודות ביעד הזה - העלו KML קודם.</p>
      ) : (
        <>
          <div className="mb-3 flex items-center gap-3">
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-black/10">
              <div className="h-full rounded-full bg-black transition-[width] duration-300" style={{ width: `${pct}%` }} />
            </div>
            <span className="shrink-0 text-xs font-semibold opacity-70">
              {done}/{total}
            </span>
          </div>

          {remaining === 0 ? (
            <p className="text-sm font-semibold text-green-700">✓ כל הנקודות הועשרו</p>
          ) : (
            <button
              onClick={runLoop}
              disabled={running}
              className="rounded-lg bg-black px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              {running ? `מעשיר... (${remaining} נקודות נותרו)` : `העשרת ${remaining} נקודות`}
            </button>
          )}
          {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        </>
      )}
    </section>
  );
}
