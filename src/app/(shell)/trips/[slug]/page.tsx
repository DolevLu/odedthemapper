import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { getTripArchiveDetail } from "@/lib/data/memories";
import { TripTrailMap } from "./TripTrailMap";

const DATE_FMT = new Intl.DateTimeFormat("he-IL", { day: "numeric", month: "short" });
const STARS = ["★", "★★", "★★★", "★★★★", "★★★★★"];

export default async function TripArchiveDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect(`/login?callbackUrl=${encodeURIComponent(`/trips/${slug}`)}`);

  const trip = await getTripArchiveDetail(session.user.id, slug);
  if (!trip) notFound();

  return (
    <div className="mx-auto max-w-3xl p-6">
      <Link href="/trips" className="text-sm font-semibold opacity-60 hover:opacity-100">
        ← כל הטיולים שלי
      </Link>

      <div className="relative mt-3 overflow-hidden rounded-2xl" style={{ background: "#EEE8DA" }}>
        {trip.heroImage && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={trip.heroImage} alt="" className="h-40 w-full object-cover" />
        )}
        <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, transparent 30%, rgba(0,0,0,0.5) 100%)" }} />
        <h1 className="absolute bottom-3 start-4 end-4 text-2xl font-bold text-white drop-shadow" style={{ fontFamily: "var(--font-heading)" }}>
          {trip.name}
        </h1>
      </div>

      {trip.hasLiveAccess ? (
        <Link href={`/trip/${trip.slug}`} className="mt-3 inline-block text-sm font-semibold underline" style={{ color: "var(--primary)" }}>
          🔓 יש לכם עדיין גישה חיה ליעד הזה - למעבר למערכת המלאה ←
        </Link>
      ) : (
        <p className="mt-3 rounded-xl border border-black/5 bg-white p-3 text-sm opacity-70">
          📁 זה ארכיון בלבד - התוכן שיצרתם ביעד הזה שמור כאן לצמיתות, גם בלי גישה חיה למפה ולתכנים המלאים.{" "}
          <Link href="/pricing" className="font-semibold underline" style={{ color: "var(--primary)" }}>
            שדרוג לגישה חיה
          </Link>
        </p>
      )}

      {/* המסלולים עצמם */}
      {trip.days.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-3 text-lg font-bold">📅 המסלול שתכננתם</h2>
          <div className="flex flex-col gap-3">
            {trip.days.map((day) => (
              <div key={day.dayIndex} className="rounded-xl border border-black/5 bg-white p-3">
                <p className="mb-2 text-sm font-bold" style={{ color: "var(--primary)" }}>
                  יום {day.dayIndex}
                </p>
                <div className="flex flex-col gap-1.5">
                  {day.items.map((item, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm">
                      {item.time && <span className="shrink-0 font-mono text-xs opacity-60">{item.time}</span>}
                      <span className="truncate">{item.label}</span>
                    </div>
                  ))}
                  {day.items.length === 0 && <p className="text-xs opacity-40">יום ריק</p>}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* פיזית איפה הלכתי */}
      <section className="mt-8">
        <h2 className="mb-3 text-lg font-bold">📍 איפה הלכתם בפועל</h2>
        <TripTrailMap points={trip.trail} />
      </section>

      {/* תמונות וסרטונים */}
      {trip.photos.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-3 text-lg font-bold">📸 האלבום שלכם</h2>
          <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-4">
            {trip.photos.map((p) => (
              <div key={p.id} className="aspect-square overflow-hidden rounded-lg bg-black/5">
                {p.type === "video" ? (
                  // eslint-disable-next-line jsx-a11y/media-has-caption
                  <video src={p.url} className="h-full w-full object-cover" muted />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.url} alt={p.caption ?? ""} className="h-full w-full object-cover" loading="lazy" />
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* דירוגי מקומות */}
      {trip.ratings.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-3 text-lg font-bold">⭐ המקומות שדירגתם</h2>
          <div className="flex flex-col gap-2">
            {trip.ratings.map((r) => (
              <div key={r.poiId} className="rounded-xl border border-black/5 bg-white p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold">{r.poiName}</span>
                  <span style={{ color: "#F59E0B" }}>{STARS[r.rating - 1]}</span>
                </div>
                <p className="text-xs opacity-60">{r.categoryName}</p>
                {r.note && <p className="mt-1 text-sm opacity-80">{r.note}</p>}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* מלונות */}
      {trip.hotels.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-3 text-lg font-bold">🏨 המלונות שהייתם בהם</h2>
          <div className="flex flex-col gap-2">
            {trip.hotels.map((h) => (
              <div key={h.id} className="flex items-center justify-between gap-2 rounded-xl border border-black/5 bg-white p-3 text-sm">
                <span className="font-semibold">{h.title}</span>
                <span className="shrink-0 opacity-60">
                  {h.startsAt && DATE_FMT.format(h.startsAt)}
                  {h.endsAt && h.endsAt.getTime() !== h.startsAt?.getTime() ? ` — ${DATE_FMT.format(h.endsAt)}` : ""}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* מסמכים */}
      {trip.documents.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-3 text-lg font-bold">📄 המסמכים שלכם</h2>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {trip.documents.map((d) => (
              <a
                key={d.id}
                href={d.imageUrl}
                target="_blank"
                rel="noreferrer"
                className="overflow-hidden rounded-xl border border-black/5 bg-white text-xs"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={d.imageUrl} alt="" className="h-24 w-full object-cover" />
                <p className="truncate p-2 font-semibold">{d.title}</p>
              </a>
            ))}
          </div>
        </section>
      )}

      {trip.days.length === 0 && trip.photos.length === 0 && trip.ratings.length === 0 && trip.hotels.length === 0 && trip.documents.length === 0 && trip.trail.length === 0 && (
        <p className="mt-8 text-center text-sm opacity-60">עדיין אין כאן זיכרונות ליעד הזה - תכננו מסלול, העלו תמונות או דרגו מקומות במפה כדי שיופיעו כאן.</p>
      )}
    </div>
  );
}
