import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { getDestinationBySlug } from "@/lib/data/destinations";
import { getAccessLevel } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { getBookingRecommendations } from "@/lib/bookingRecommendations";
import { getUpcomingHolidays } from "@/lib/holidays";
import { UpgradeRequired } from "@/components/UpgradeRequired";
import { BookableList } from "./BookableList";
import { getLang, getServerT } from "@/lib/i18n/server";

export default async function BookablePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [destination, session] = await Promise.all([getDestinationBySlug(slug), auth()]);
  if (!destination) notFound();
  const accessLevel = await getAccessLevel(session?.user?.id, destination.id);
  if (accessLevel === "none") {
    if (!session?.user?.id) redirect(`/login?callbackUrl=${encodeURIComponent(`/trip/${slug}/bookable`)}`);
    return <UpgradeRequired tier="silver" />;
  }

  const userId = session!.user!.id;
  const [t, lang] = await Promise.all([getServerT(), getLang()]);
  const dateLocale = lang === "en" ? "en-GB" : "he-IL";

  const [pois, favorites] = await Promise.all([
    prisma.pointOfInterest.findMany({
      where: {
        geometryType: "point",
        category: { area: { destinationId: destination.id } },
      },
      include: { category: { include: { area: true } }, photos: { take: 1 }, tags: true },
      take: 400,
    }),
    prisma.favorite.findMany({ where: { userId }, select: { poiId: true } }),
  ]);

  const favoritedIds = new Set(favorites.map((f) => f.poiId));

  const items = pois.map((p) => ({
    id: p.id,
    name: p.name,
    areaName: p.category.area.name,
    categoryName: p.category.name,
    categoryColor: p.category.colorHex,
    photoUrl: p.photos[0]?.url ?? null,
    hours: p.hours,
    tags: p.tags.map((t) => t.label),
    bookingUrl: p.bookingUrl,
    wantsBooking: p.wantsBooking,
    favorited: favoritedIds.has(p.id),
  }));

  const recommendations = getBookingRecommendations(slug);
  const holidays = getUpcomingHolidays(slug).slice(0, 5);

  return (
    <div className="flex flex-col gap-3">
      {/* Holidays + booking tips: a single slim row each, so the attractions list below is what you see first. */}
      {holidays.length > 0 && (
        <div className="-mx-4 flex items-center gap-1.5 overflow-x-auto px-4 pb-0.5 sm:mx-0 sm:px-0" title={t("bookable.holidaysNote")}>
          <span className="shrink-0 text-xs font-bold opacity-70">{t("bookable.upcomingHolidays")}</span>
          {holidays.map((h) => (
            <span key={`${h.date}-${h.name}`} className="shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold" style={{ background: "color-mix(in srgb, var(--primary) 10%, transparent)" }}>
              🎉 {h.name} · <span className="opacity-60">{new Date(h.date).toLocaleDateString(dateLocale, { day: "numeric", month: "numeric" })}</span>
            </span>
          ))}
        </div>
      )}

      {recommendations.length > 0 && (
        <details className="group rounded-xl border px-3 py-2" style={{ borderColor: "color-mix(in srgb, var(--primary) 18%, transparent)", background: "var(--surface)" }}>
          <summary className="flex cursor-pointer list-none items-center justify-between gap-2 text-xs font-bold">
            <span>{t("bookable.recommendationsTitle")}</span>
            <span className="text-[11px] font-normal opacity-50 group-open:hidden">{recommendations.length} ▾</span>
          </summary>
          <ul className="mt-2 flex flex-col gap-1.5">
            {recommendations.map((rec) => (
              <li key={rec.title} className="text-xs leading-snug">
                <span className="font-semibold">✨ {rec.title}</span> <span className="opacity-65">- {rec.note}</span>
              </li>
            ))}
          </ul>
        </details>
      )}

      <section>
        <h2 className="text-lg font-bold" style={{ fontFamily: "var(--font-heading)" }}>
          {t("bookable.listTitle")}
        </h2>
        <p className="mb-3 text-sm opacity-70">{t("bookable.listBody")}</p>
        <BookableList pois={items} slug={slug} />
      </section>
    </div>
  );
}
