import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { getDestinationBySlug } from "@/lib/data/destinations";
import { getAccessLevel } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { getBookingRecommendations } from "@/lib/bookingRecommendations";
import { getUpcomingHolidays } from "@/lib/holidays";
import { UpgradeRequired } from "@/components/UpgradeRequired";
import { BookableList } from "./BookableList";
import { InfoStrip, InfoCard } from "@/components/InfoStrip";
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
    <div className="flex flex-col gap-5">
      {holidays.length > 0 && (
        <InfoStrip title={t("bookable.upcomingHolidays")} hint={t("bookable.holidaysNote")}>
          {holidays.map((h) => (
            <InfoCard key={`${h.date}-${h.name}`} title={`🎉 ${h.name}`} label={new Date(h.date).toLocaleDateString(dateLocale, { day: "numeric", month: "long" })} />
          ))}
        </InfoStrip>
      )}

      <InfoStrip title={t("bookable.recommendationsTitle")} hint={t("bookable.recommendationsBody")}>
        {recommendations.map((rec) => (
          <InfoCard key={rec.title} title={`✨ ${rec.title}`} body={rec.note} />
        ))}
      </InfoStrip>

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
