"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { setTripStartDate, togglePackingCheck } from "@/lib/actions/trip";

export function TodayCard({
  destinationId,
  destinationName,
  slug,
  hasTargetDate,
  daysUntil,
  targetDateLabel,
  todayDayItems,
  bookableItems,
}: {
  destinationId: string;
  destinationName: string;
  slug: string;
  hasTargetDate: boolean;
  daysUntil: number | null;
  targetDateLabel: string | null;
  todayDayItems: { time: string | null; label: string }[] | null;
  bookableItems: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [dateInput, setDateInput] = useState("");
  const [sentIds, setSentIds] = useState<Set<string>>(new Set());

  function saveDate() {
    if (!dateInput) return;
    startTransition(async () => {
      await setTripStartDate(destinationId, slug, dateInput);
      router.refresh();
    });
  }

  function markAsBooked(poiId: string) {
    setSentIds((s) => new Set(s).add(poiId));
    startTransition(() => {
      togglePackingCheck(destinationId, `booking:${poiId}`, slug);
    });
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Countdown / mascot card */}
      <div
        className="relative flex flex-col items-center gap-3 overflow-hidden border p-6 text-center"
        style={{ borderRadius: "var(--radius)", borderColor: "var(--primary)", background: "var(--surface)" }}
      >
        <h1 className="text-xl font-bold" style={{ fontFamily: "var(--font-heading)" }}>
          {destinationName} מחכה לנו
        </h1>
        <div className="flex items-center gap-2 text-4xl">
          <span className="inline-block animate-float-drift" style={{ ["--float-duration" as string]: "4s", ["--float-rot" as string]: "-6deg" }}>
            🧑‍🦱
          </span>
          <span className="text-2xl">🎒</span>
          <span className="inline-block animate-float-drift" style={{ ["--float-duration" as string]: "4.5s", ["--float-rot" as string]: "6deg" }}>
            🧑
          </span>
          <span className="text-2xl">✈️</span>
        </div>

        {daysUntil !== null ? (
          <>
            <p className="text-5xl font-extrabold" style={{ color: "var(--primary)" }}>
              {daysUntil} ימים
            </p>
            <p className="text-sm opacity-60">עד ההמראה · {targetDateLabel}</p>
          </>
        ) : hasTargetDate ? (
          <p className="text-lg font-bold" style={{ color: "var(--primary)" }}>
            ✈️ הטיול כבר כאן — תיהנו!
          </p>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <p className="text-sm opacity-70">עדיין לא הוגדר תאריך טיסה — הוסיפו טיסה בלוגיסטיקה, או קבעו כאן תאריך יעד:</p>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={dateInput}
                onChange={(e) => setDateInput(e.target.value)}
                className="rounded-lg border px-3 py-2 text-sm"
                style={{ borderColor: "var(--primary)" }}
              />
              <button
                onClick={saveDate}
                disabled={pending || !dateInput}
                className="rounded-full px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                style={{ background: "var(--primary)" }}
              >
                שמירה
              </button>
            </div>
            <Link href={`/trip/${slug}/logistics`} className="text-xs underline opacity-60">
              או הוסיפו כרטיס טיסה בלוגיסטיקה
            </Link>
          </div>
        )}
      </div>

      {/* Today's itinerary, if mid-trip */}
      {todayDayItems && todayDayItems.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-bold">📅 המסלול שלכם היום</h2>
          <div className="flex flex-col gap-2">
            {todayDayItems.map((item, i) => (
              <div
                key={i}
                className="flex items-center gap-3 border p-3 text-sm"
                style={{ borderRadius: "var(--radius)", borderColor: "color-mix(in srgb, var(--primary) 25%, transparent)", background: "var(--surface)" }}
              >
                {item.time && <span className="font-mono text-xs opacity-70">{item.time}</span>}
                <span>{item.label}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Things to remember to book */}
      {bookableItems.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-bold">🎟️ לזכור להזמין</h2>
          <div className="flex flex-col gap-2">
            {bookableItems.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between gap-2 border p-3 text-sm"
                style={{ borderRadius: "var(--radius)", borderColor: "color-mix(in srgb, var(--primary) 25%, transparent)", background: "var(--surface)" }}
              >
                <span>{item.name}</span>
                <button
                  onClick={() => markAsBooked(item.id)}
                  disabled={sentIds.has(item.id)}
                  className="shrink-0 rounded-full border px-3 py-1 text-xs font-semibold disabled:opacity-50"
                  style={{ borderColor: "var(--primary)", color: sentIds.has(item.id) ? undefined : "var(--primary)" }}
                >
                  {sentIds.has(item.id) ? "✓ נשלח לצ׳ק ליסט" : "שליחה לצ׳ק ליסט"}
                </button>
              </div>
            ))}
          </div>
          <Link href={`/trip/${slug}/packing`} className="mt-2 inline-block text-xs underline opacity-60">
            לצ׳ק ליסט המלא ←
          </Link>
        </section>
      )}
    </div>
  );
}
