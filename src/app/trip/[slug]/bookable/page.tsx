import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { getDestinationBySlug } from "@/lib/data/destinations";
import { getAccessLevel } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { getBookingRecommendations } from "@/lib/bookingRecommendations";
import { getUpcomingHolidays } from "@/lib/holidays";
import { UpgradeRequired } from "@/components/UpgradeRequired";
import { BookableList } from "./BookableList";

export default async function BookablePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const destination = await getDestinationBySlug(slug);
  if (!destination) notFound();

  const session = await auth();
  const accessLevel = await getAccessLevel(session?.user?.id, destination.id);
  if (accessLevel === "none") {
    if (!session?.user?.id) redirect(`/login?callbackUrl=${encodeURIComponent(`/trip/${slug}/bookable`)}`);
    return <UpgradeRequired tier="silver" />;
  }

  const userId = session!.user!.id;

  const [pois, favorites] = await Promise.all([
    prisma.pointOfInterest.findMany({
      where: {
        category: {
          area: { destinationId: destination.id },
          name: { contains: "אטרקציות" },
        },
      },
      include: { category: { include: { area: true } }, photos: { take: 1 }, tags: true },
      take: 200,
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
    <div className="flex flex-col gap-8">
      {holidays.length > 0 && (
        <section className="border p-3 sm:p-5" style={{ borderRadius: "var(--radius)", borderColor: "var(--primary)", background: "var(--surface)" }}>
          <h2 className="mb-0.5 text-sm font-bold sm:text-lg">📅 חגים וימי חג קרובים</h2>
          <p className="mb-2 text-xs opacity-70 sm:mb-4 sm:text-sm">
            שימו לב שבחגים רבים עסקים ואתרים עשויים לפעול בשעות שונות או להיות סגורים.
          </p>
          <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2 sm:gap-2">
            {holidays.map((h) => (
              <div
                key={`${h.date}-${h.name}`}
                className="flex items-center justify-between gap-2 border px-2.5 py-1.5 text-xs transition-transform duration-200 hover:-translate-y-0.5 hover:rotate-[-0.5deg] sm:p-3 sm:text-base"
                style={{ background: "var(--background)", borderRadius: "var(--radius)", borderColor: "color-mix(in srgb, var(--primary) 15%, transparent)" }}
              >
                <span className="truncate font-semibold">🎉 {h.name}</span>
                <span className="shrink-0 text-[11px] opacity-60 sm:text-sm">{new Date(h.date).toLocaleDateString("he-IL")}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      <section
        className="border p-3 sm:p-5"
        style={{ borderRadius: "var(--radius)", borderColor: "var(--primary)", background: "var(--surface)" }}
      >
        <h1 className="mb-0.5 text-base font-bold sm:text-xl">🎟️ המלצות מה כדאי להזמין שלנו</h1>
        <p className="mb-2 text-xs opacity-70 sm:mb-4 sm:text-sm">דברים שכדאי לדעתנו לשקול להזמין מראש ביעד הזה.</p>
        <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2 sm:gap-3">
          {recommendations.map((rec) => (
            <div
              key={rec.title}
              className="border px-2.5 py-1.5 text-xs transition-transform duration-200 hover:-translate-y-0.5 hover:rotate-[0.5deg] sm:p-3 sm:text-base"
              style={{ background: "var(--background)", borderRadius: "var(--radius)", borderColor: "color-mix(in srgb, var(--primary) 15%, transparent)" }}
            >
              <p className="font-semibold">✨ {rec.title}</p>
              <p className="text-[11px] opacity-70 sm:text-sm">{rec.note}</p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-2 text-lg font-bold">רשימת אטרקציות</h2>
        <p className="mb-6 text-sm opacity-70">סמנו אטרקציות שתרצו להזמין מראש כדי לעקוב אחריהן בקלות.</p>
        <BookableList pois={items} slug={slug} />
      </section>
    </div>
  );
}
