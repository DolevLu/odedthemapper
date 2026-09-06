"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { setTripStartDateTime } from "@/lib/actions/trip";
import { flagForSlug } from "@/lib/countryFlags";
import { emojiForCategory } from "@/components/CategoryIcon";
import { standardCategoryColor } from "@/lib/mapStyles";
import { shortCategoryLabel } from "@/lib/categoryLabels";
import { proxiedImageUrl } from "@/lib/imageProxy";

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
  myDestinations,
}: {
  destinationId: string;
  destinationName: string;
  heroImage: string | null;
  slug: string;
  logisticId: string | null;
  targetDateTimeIso: string | null;
  todayDayItems: { time: string | null; label: string; poiId: string | null; categoryName: string | null; photoUrl: string | null }[] | null;
  /** Every other destination this user's subscription currently covers —
   * lets a paying customer with more than one active destination (family/org
   * plans) jump straight between them instead of going through /destinations
   * every time. Empty for solo-plan users with only this one destination. */
  myDestinations: { slug: string; name: string }[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [editing, setEditing] = useState(!targetDateTimeIso);
  const [dateTimeInput, setDateTimeInput] = useState(() =>
    targetDateTimeIso ? toDateTimeLocalValue(new Date(targetDateTimeIso)) : ""
  );
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

  // The stop happening right now, per the itinerary's own "where am I" rule
  // (the last time-stamped stop at or before right-now) — same comparison
  // DayItemsList/DayRouteMap already use, kept in sync deliberately so
  // "current" always means the same thing everywhere. Recomputed from the
  // ticking `now` state above (not a static server-computed value), so it
  // naturally moves on to the next stop without a page refresh.
  let currentStop: (typeof todayDayItems extends (infer T)[] | null ? T : never) | null = null;
  if (now && todayDayItems) {
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    for (const item of todayDayItems) {
      if (!item.time) continue;
      const [h, m] = item.time.split(":").map(Number);
      if (h * 60 + m <= nowMinutes) currentStop = item;
    }
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

  return (
    <div className="flex flex-col gap-4">
      {/* Quick-switch between every destination this subscription covers (1
       * for solo, up to 5 for family, chosen by the user and swappable every
       * 14 days — see SwapDestinationButton) — jumps straight there instead
       * of going through /destinations. Only shows up when there's actually
       * more than one, i.e. never for solo-plan users. Its own row above the
       * countdown card, centered, rather than an overlay inside it — reads
       * as a real destination switcher instead of a decoration on the card. */}
      {myDestinations.length > 0 && (
        <div className="flex items-center justify-center gap-1.5">
          {myDestinations.map((d) => (
            <Link
              key={d.slug}
              href={`/trip/${d.slug}/now`}
              title={d.name}
              aria-label={d.name}
              className="flex h-7 w-7 items-center justify-center rounded-full border bg-white text-sm shadow-sm transition-transform hover:scale-110 sm:h-8 sm:w-8 sm:text-base"
              style={{ borderColor: "var(--primary)" }}
            >
              {flagForSlug(d.slug)}
            </Link>
          ))}
        </div>
      )}

      {/* Countdown card — a hero photo of the destination (Colosseum for
       * Italy, Eiffel Tower for France, etc. — whatever the destination's
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
                ✈️ הטיול כבר כאן - תיהנו!
              </p>
              <button onClick={openEdit} className="text-xs underline opacity-60 hover:opacity-100">
                ✏️ עריכת מועד הטיסה
              </button>
            </>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <p className="text-sm opacity-70">
                {targetDateTimeIso ? "עדכנו את מועד הטיסה:" : "עדיין לא הוגדר מועד טיסה - הוסיפו טיסה בלוגיסטיקה, או קבעו כאן מועד יעד:"}
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

      {/* The one stop happening right now, if any — a shortcut to the full
       * itinerary. Deliberately just this one stop, not the whole day's
       * list: showing "what's now" is the point of this screen. */}
      {currentStop && (
        <Link
          href={`/trip/${slug}/itinerary`}
          className="flex items-center gap-3 border p-3.5 shadow-sm transition-shadow hover:shadow-md"
          style={{ borderRadius: "var(--radius)", borderColor: "color-mix(in srgb, #22C55E 30%, transparent)", background: "var(--surface)" }}
        >
          {currentStop.photoUrl ? (
            <Image
              src={proxiedImageUrl(currentStop.photoUrl)}
              alt=""
              width={40}
              height={40}
              className="h-10 w-10 shrink-0 rounded-full object-cover"
            />
          ) : (
            <span
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-lg"
              style={{ background: `color-mix(in srgb, ${standardCategoryColor(currentStop.categoryName ?? "", "#94A3B8")} 18%, var(--surface))` }}
              aria-hidden
            >
              {emojiForCategory(currentStop.categoryName ?? "")}
            </span>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold leading-snug">{currentStop.label}</p>
            <p className="truncate text-xs leading-snug opacity-55">{currentStop.categoryName ? shortCategoryLabel(currentStop.categoryName) : "מסלול"}</p>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1">
            {currentStop.time && (
              <span className="rounded-full px-2.5 py-1 font-mono text-xs font-bold text-white" style={{ background: "#22C55E" }}>
                {currentStop.time}
              </span>
            )}
            <span className="text-[10px] font-bold" style={{ color: "#16A34A" }}>
              עכשיו
            </span>
          </div>
        </Link>
      )}
    </div>
  );
}
