import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getTripArchiveSummaries } from "@/lib/data/memories";

const DATE_FMT = new Intl.DateTimeFormat("he-IL", { month: "long", year: "numeric" });

export default async function TripsArchivePage() {
  const session = await auth();
  if (!session?.user?.id) redirect(`/login?callbackUrl=${encodeURIComponent("/trips")}`);

  const trips = await getTripArchiveSummaries(session.user.id);

  return (
    <div className="mx-auto max-w-5xl p-6">
      <h1 className="text-2xl font-bold" style={{ fontFamily: "var(--font-heading)" }}>
        🧳 הטיולים שלי
      </h1>
      <p className="mt-1 text-sm opacity-60">
        המסלולים, התמונות, הדירוגים והמלונות שלכם מכל יעד שהייתם בו - נשמרים כאן לצמיתות, גם אם כבר אין לכם גישה חיה ליעד.
      </p>

      {trips.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-black/5 bg-white p-10 text-center">
          <p className="text-4xl">🗺️</p>
          <p className="mt-3 font-semibold">עדיין אין כאן טיולים</p>
          <p className="mt-1 text-sm opacity-60">ברגע שתתחילו לתכנן יעד, הוא יופיע כאן אוטומטית.</p>
          <Link href="/destinations" className="mt-4 inline-block text-sm font-semibold underline" style={{ color: "var(--primary)" }}>
            בחירת יעד ←
          </Link>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {trips.map((trip) => (
            <Link
              key={trip.destinationId}
              href={`/trips/${trip.slug}`}
              className="group overflow-hidden rounded-2xl border border-black/5 bg-white shadow-sm transition-shadow hover:shadow-md"
            >
              <div className="relative h-32 w-full overflow-hidden" style={{ background: "#EEE8DA" }}>
                {trip.heroImage && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={trip.heroImage} alt="" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
                )}
                <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, transparent 40%, rgba(0,0,0,0.45) 100%)" }} />
                <div className="absolute bottom-2 start-3 end-3 flex items-end justify-between gap-2">
                  <span className="font-bold text-white drop-shadow">{trip.name}</span>
                  {trip.hasLiveAccess && (
                    <span className="shrink-0 rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-bold" style={{ color: "var(--primary)" }}>
                      גישה פעילה
                    </span>
                  )}
                </div>
              </div>
              <div className="flex flex-wrap gap-x-3 gap-y-1 p-3 text-xs opacity-70">
                <span>📅 {trip.dayCount} ימי מסלול</span>
                <span>📸 {trip.photoCount} תמונות</span>
                <span>⭐ {trip.ratedCount} דירוגים</span>
                <span>🏨 {trip.hotelCount} מלונות</span>
              </div>
              <p className="px-3 pb-3 text-[11px] opacity-40">מאז {DATE_FMT.format(trip.firstAccessAt)}</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
