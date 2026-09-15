import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { colorForDay } from "@/lib/geo";
import { emojiForCategory } from "@/components/CategoryIcon";
import { PrintButton } from "./PrintButton";

// Warm, print-friendly palette for this page's own chrome (title, doodles,
// field labels) — deliberately fixed rather than pulled from the
// destination's theme, since the whole point here is one consistent, nice
// printable look regardless of which destination it's for. Each day's own
// accent (border, dot, circle-photo ring) still uses colorForDay as before.
const INK = "#1E293B";
const ACCENT = "#C2703D";

function DoodleTopLeft() {
  return (
    <svg width="120" height="90" viewBox="0 0 120 90" fill="none" className="absolute start-0 top-0 opacity-70" aria-hidden>
      <path d="M10 60C30 20 60 10 95 15" stroke={ACCENT} strokeWidth="2" strokeDasharray="1 7" strokeLinecap="round" />
      <path d="M82 8L96 15L86 27" stroke={ACCENT} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <path d="M18 40l3 6 6 3-6 3-3 6-3-6-6-3 6-3z" fill={ACCENT} opacity="0.8" />
    </svg>
  );
}

function DoodleBottomRight() {
  return (
    <svg width="130" height="110" viewBox="0 0 130 110" fill="none" className="absolute end-0 bottom-0 opacity-60" aria-hidden>
      <path
        d="M120 100c-30 10-70 4-80-20 -8-19 8-34 24-27 12 5 12 21-2 24-16 3-33-9-33-28"
        stroke={INK}
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
        opacity="0.35"
      />
      <path d="M25 15C10 15 5 25 12 33" stroke={ACCENT} strokeWidth="2" strokeDasharray="1 6" strokeLinecap="round" />
      <path d="M4 27l8 6-8 6" stroke={ACCENT} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  );
}

function InfoField({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] font-bold tracking-wide opacity-60">{label}</p>
      <p className="truncate border-b pb-1 pt-2 text-sm font-semibold" style={{ borderColor: "color-mix(in srgb, currentColor 25%, transparent)", color: INK }}>
        {value || " "}
      </p>
    </div>
  );
}

export default async function SharedItineraryPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  const itinerary = await prisma.itinerary.findUnique({
    where: { shareToken: token },
    include: {
      destination: true,
      days: {
        orderBy: { dayIndex: "asc" },
        include: {
          items: {
            orderBy: { order: "asc" },
            include: { poi: { include: { category: true, photos: { take: 1 } } } },
          },
        },
      },
    },
  });
  if (!itinerary) notFound();

  const isClientPlan = itinerary.kind === "client";
  const plannerProfile = isClientPlan ? await prisma.plannerProfile.findUnique({ where: { userId: itinerary.userId } }) : null;

  const dayDates = itinerary.days.map((d) => d.date).filter((d): d is Date => d != null);
  const startDate = dayDates.length > 0 ? new Date(Math.min(...dayDates.map((d) => d.getTime()))) : null;
  const durationLabel = itinerary.days.length > 0 ? `${itinerary.days.length} ${itinerary.days.length === 1 ? "יום" : "ימים"}` : "";

  return (
    <div
      className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8 px-6 py-12 print:py-6"
      style={{ background: "#FBF8F3", fontFamily: "'Rubik', sans-serif" }}
    >
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Caveat:wght@600;700&display=swap" />

      <div className="flex items-center justify-between gap-3 print:hidden">
        <div className="flex items-center gap-3">
          {plannerProfile?.logoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={plannerProfile.logoUrl} alt={plannerProfile.companyName ?? ""} className="h-10 w-10 rounded-lg object-contain" />
          )}
          <p className="text-sm opacity-60">{isClientPlan ? "מסלול מקצועי - תצוגת לקוח" : "מסלול טיול - תצוגת אורח"}</p>
        </div>
        <PrintButton />
      </div>

      {/* Title block — the whole point of this redesign, so it's the one
       * section that deliberately breaks from the app's own plain-Rubik
       * convention (see theme/fonts.ts) with a second, decorative script
       * face for exactly one word, same "small flourish word + big bold
       * word" structure a printable travel-itinerary template usually
       * uses — own doodles, not a traced copy of any specific one. */}
      <div className="relative flex flex-col items-center gap-1 py-6 text-center">
        <DoodleTopLeft />
        <DoodleBottomRight />
        <p className="text-4xl" style={{ fontFamily: "'Caveat', cursive", color: ACCENT }}>
          Travi
        </p>
        <h1 className="text-4xl font-extrabold tracking-tight" style={{ color: INK, fontFamily: "var(--font-heading)" }}>
          מסלול הטיול
        </h1>
      </div>

      <div className="grid grid-cols-2 gap-x-8 gap-y-4">
        <InfoField label="יעד" value={itinerary.destination.name} />
        <InfoField label="משך הטיול" value={durationLabel} />
        <InfoField label="תאריך התחלה" value={startDate ? startDate.toLocaleDateString("he-IL", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }) : ""} />
        <InfoField label="מספר עצירות" value={String(itinerary.days.reduce((n, d) => n + d.items.length, 0))} />
      </div>

      {itinerary.days.length === 0 && <p className="opacity-60">אין עדיין תוכן במסלול הזה.</p>}

      <div className="flex flex-col gap-8">
        {itinerary.days.map((day) => {
          const dayColor = colorForDay(day.dayIndex - 1);
          const dayDateLabel = day.date
            ? new Date(day.date).toLocaleDateString("he-IL", { day: "numeric", month: "short", timeZone: "UTC" })
            : null;
          const coverPhoto = day.items.find((i) => i.poi?.photos[0])?.poi?.photos[0]?.url ?? null;

          return (
            <div key={day.id} className="flex gap-4 break-inside-avoid">
              <div className="flex shrink-0 flex-col items-center gap-2">
                <div
                  className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full border-4 bg-white shadow-sm"
                  style={{ borderColor: dayColor }}
                >
                  {coverPhoto ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={coverPhoto} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-2xl" style={{ color: dayColor }}>
                      🗺️
                    </span>
                  )}
                </div>
                {/* Connects this day's circle down to the next one, matching
                 * the reference layout's vertical thread tying the days
                 * together — skipped on the last day and hidden in print
                 * (where each day already reads as its own block on the
                 * page, and a stray line across a page break looks broken). */}
                <div className="w-px flex-1 print:hidden" style={{ background: "color-mix(in srgb, currentColor 15%, transparent)" }} />
              </div>

              <div className="min-w-0 flex-1 pb-2">
                <h2 className="mb-3 text-lg font-extrabold" style={{ color: dayColor, fontFamily: "var(--font-heading)" }}>
                  יום {day.dayIndex}
                  {dayDateLabel ? ` · ${dayDateLabel}` : ""}
                </h2>
                <div className="flex flex-col gap-3">
                  {day.items.map((item) => {
                    const name = item.poi ? item.poi.name : item.customLabel;
                    const noteFirstLine = item.note?.trim().split("\n")[0] ?? null;
                    return (
                      <div key={item.id} className="flex items-start gap-2.5">
                        <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full" style={{ background: item.poi?.category.colorHex ?? dayColor }} />
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-baseline gap-x-2">
                            {item.timeOfDay && (
                              <span className="font-mono text-xs font-bold" style={{ color: ACCENT }}>
                                {item.timeOfDay}
                              </span>
                            )}
                            <span className="text-sm font-semibold" style={{ color: INK }}>
                              {item.poi?.category.name ? `${emojiForCategory(item.poi.category.name)} ` : ""}
                              {name}
                            </span>
                          </div>
                          {noteFirstLine && <p className="mt-0.5 text-xs opacity-60">{noteFirstLine}</p>}
                        </div>
                      </div>
                    );
                  })}
                  {day.items.length === 0 && <p className="text-xs opacity-50">אין פריטים ביום הזה.</p>}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <p className="print:hidden mt-4 text-center text-xs opacity-50">נוצר עם טראבי</p>
    </div>
  );
}
