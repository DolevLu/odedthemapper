"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { setTripStartDateTime, togglePackingCheck } from "@/lib/actions/trip";

/** Formats a Date as the value a <input type="datetime-local"> expects
 * ("YYYY-MM-DDTHH:mm"), using the browser's local time components — NOT
 * toISOString(), which is UTC and would silently shift the prefilled time
 * away from what the user actually set. */
function toDateTimeLocalValue(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function CountdownBlock({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center">
      <span className="text-4xl font-extrabold tabular-nums sm:text-5xl" style={{ color: "var(--primary)" }}>
        {String(value).padStart(2, "0")}
      </span>
      <span className="text-xs opacity-60">{label}</span>
    </div>
  );
}

export function TodayCard({
  destinationId,
  destinationName,
  heroImage,
  slug,
  logisticId,
  targetDateTimeIso,
  todayDayItems,
  bookableItems,
}: {
  destinationId: string;
  destinationName: string;
  heroImage: string | null;
  slug: string;
  logisticId: string | null;
  targetDateTimeIso: string | null;
  todayDayItems: { time: string | null; label: string }[] | null;
  bookableItems: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [editing, setEditing] = useState(!targetDateTimeIso);
  const [dateTimeInput, setDateTimeInput] = useState(() =>
    targetDateTimeIso ? toDateTimeLocalValue(new Date(targetDateTimeIso)) : ""
  );
  const [sentIds, setSentIds] = useState<Set<string>>(new Set());
  const [now, setNow] = useState<Date | null>(null);

  // Ticks the live countdown every minute — started only after mount so the
  // server-rendered HTML and the first client render match (a `now` computed
  // during render would differ between server and browser clocks/renders).
  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  const targetDate = targetDateTimeIso ? new Date(targetDateTimeIso) : null;
  const remainingMs = targetDate && now ? targetDate.getTime() - now.getTime() : null;
  const tripAlreadyHere = remainingMs !== null && remainingMs <= 0;

  let countdown: { days: number; hours: number; minutes: number } | null = null;
  if (remainingMs !== null && remainingMs > 0) {
    const totalMinutes = Math.floor(remainingMs / 60_000);
    countdown = {
      days: Math.floor(totalMinutes / (60 * 24)),
      hours: Math.floor((totalMinutes % (60 * 24)) / 60),
      minutes: totalMinutes % 60,
    };
  }

  function openEdit() {
    if (targetDateTimeIso) setDateTimeInput(toDateTimeLocalValue(new Date(targetDateTimeIso)));
    setEditing(true);
  }

  function saveDate() {
    if (!dateTimeInput) return;
    startTransition(async () => {
      await setTripStartDateTime(destinationId, slug, logisticId, dateTimeInput);
      setEditing(false);
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
      {/* Countdown / mascot card — a hero photo of the destination (Colosseum
       * for Italy, Eiffel Tower for France, etc. — whatever the destination's
       * own heroImage is) sits behind the content, shown near-full strength
       * so it actually reads as a photo rather than faint texture. The
       * gradient still fades to solid surface toward the bottom (kicking in
       * earlier than the top-to-bottom span, not gradually across all of it)
       * so the countdown numbers below it stay fully legible regardless of
       * the photo's own brightness/colors. */}
      <div
        className="relative flex flex-col items-center gap-3 overflow-hidden border p-6 text-center"
        style={{ borderRadius: "var(--radius)", borderColor: "var(--primary)", background: "var(--surface)" }}
      >
        {heroImage && (
          <>
            <div
              className="absolute inset-0"
              style={{ backgroundImage: `url(${heroImage})`, backgroundSize: "cover", backgroundPosition: "center", opacity: 0.55 }}
            />
            <div
              className="absolute inset-0"
              style={{ background: "linear-gradient(180deg, transparent 0%, transparent 30%, var(--surface) 75%)" }}
            />
          </>
        )}

        <div className="relative z-10 flex w-full flex-col items-center gap-3">
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

          {!editing && countdown ? (
            <>
              {/* dir="ltr" pins days→hours→minutes reading left-to-right
               * (largest unit leftmost, like a normal digital countdown)
               * regardless of the page's own RTL direction, which would
               * otherwise flip the DOM order visually right-to-left. */}
              <div dir="ltr" className="flex items-center gap-3 sm:gap-5">
                <CountdownBlock value={countdown.days} label="ימים" />
                <span className="pb-4 text-2xl font-bold opacity-30">:</span>
                <CountdownBlock value={countdown.hours} label="שעות" />
                <span className="pb-4 text-2xl font-bold opacity-30">:</span>
                <CountdownBlock value={countdown.minutes} label="דקות" />
              </div>
              <button onClick={openEdit} className="text-xs underline opacity-60 hover:opacity-100">
                ✏️ {targetDate!.toLocaleString("he-IL", { dateStyle: "short", timeStyle: "short" })} · עריכת מועד הטיסה
              </button>
            </>
          ) : !editing && tripAlreadyHere ? (
            <>
              <p className="text-lg font-bold" style={{ color: "var(--primary)" }}>
                ✈️ הטיול כבר כאן — תיהנו!
              </p>
              <button onClick={openEdit} className="text-xs underline opacity-60 hover:opacity-100">
                ✏️ עריכת מועד הטיסה
              </button>
            </>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <p className="text-sm opacity-70">
                {targetDateTimeIso ? "עדכנו את מועד הטיסה:" : "עדיין לא הוגדר מועד טיסה — הוסיפו טיסה בלוגיסטיקה, או קבעו כאן מועד יעד:"}
              </p>
              <div className="flex flex-wrap items-center justify-center gap-2">
                <input
                  type="datetime-local"
                  value={dateTimeInput}
                  onChange={(e) => setDateTimeInput(e.target.value)}
                  className="rounded-lg border px-3 py-2 text-sm"
                  style={{ borderColor: "var(--primary)" }}
                />
                <button
                  onClick={saveDate}
                  disabled={pending || !dateTimeInput}
                  className="rounded-full px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                  style={{ background: "var(--primary)" }}
                >
                  שמירה
                </button>
                {targetDateTimeIso && (
                  <button onClick={() => setEditing(false)} className="rounded-full px-3 py-2 text-xs font-semibold opacity-60">
                    ביטול
                  </button>
                )}
              </div>
              {!targetDateTimeIso && (
                <Link href={`/trip/${slug}/logistics`} className="text-xs underline opacity-60">
                  או הוסיפו כרטיס טיסה בלוגיסטיקה
                </Link>
              )}
            </div>
          )}
        </div>
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
