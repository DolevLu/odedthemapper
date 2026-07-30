import { notFound } from "next/navigation";
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
  if (accessLevel === "none") return <UpgradeRequired tier="silver" />;

  const pois = await prisma.pointOfInterest.findMany({
    where: {
      category: {
        area: { destinationId: destination.id },
        name: { contains: "אטרקציות" },
      },
    },
    include: { category: { include: { area: true } } },
    take: 200,
  });

  const items = pois.map((p) => ({
    id: p.id,
    name: p.name,
    areaName: p.category.area.name,
    categoryName: p.category.name,
    bookingUrl: p.bookingUrl,
    wantsBooking: p.wantsBooking,
  }));

  const recommendations = getBookingRecommendations(slug);
  const holidays = getUpcomingHolidays(slug).slice(0, 5);

  return (
    <div className="flex flex-col gap-8">
      {holidays.length > 0 && (
        <section className="border p-5" style={{ borderRadius: "var(--radius)", borderColor: "var(--primary)", background: "var(--surface)" }}>
          <h2 className="mb-1 text-lg font-bold">📅 חגים וימי חג קרובים</h2>
          <p className="mb-4 text-sm opacity-70">
            חגים ציבוריים ביעד — שימו לב שבחגים רבים עסקים ואתרים עשויים לפעול בשעות שונות או להיות סגורים.
          </p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {holidays.map((h) => (
              <div key={`${h.date}-${h.name}`} className="flex items-center justify-between rounded-lg p-3" style={{ background: "var(--background)", borderRadius: "var(--radius)" }}>
                <span className="font-semibold">{h.name}</span>
                <span className="text-sm opacity-60">{new Date(h.date).toLocaleDateString("he-IL")}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      <section
        className="border p-5"
        style={{ borderRadius: "var(--radius)", borderColor: "var(--primary)", background: "var(--surface)" }}
      >
        <h1 className="mb-1 text-xl font-bold">🎟️ המלצות מה כדאי להזמין שלנו</h1>
        <p className="mb-4 text-sm opacity-70">דברים שכדאי לדעתנו לשקול להזמין מראש ביעד הזה.</p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {recommendations.map((rec) => (
            <div key={rec.title} className="rounded-lg p-3" style={{ background: "var(--background)", borderRadius: "var(--radius)" }}>
              <p className="font-semibold">{rec.title}</p>
              <p className="text-sm opacity-70">{rec.note}</p>
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
