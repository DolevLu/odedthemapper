import { prisma } from "@/lib/prisma";
import { haversineKm } from "@/lib/geo";
import { COUNTRY_BY_SLUG } from "@/lib/countryFlags";

export type FinishedTrip = {
  destinationId: string;
  destinationSlug: string;
  destinationName: string;
  flag: string | null;
  endedAt: Date;
};

/** A "finished trip" is a destination the user was subscribed to whose
 * logistics (flights/hotel) imply a real end date already in the past —
 * there's no explicit trip-dates concept elsewhere in the data model, so
 * the latest TripLogistic endsAt/startsAt for that destination stands in
 * as "when the trip ended." A destination with no dated logistics entries
 * never appears here — nothing to infer an end date from. */
export async function getFinishedTrips(userId: string): Promise<FinishedTrip[]> {
  const subs = await prisma.subscriptionDestination.findMany({
    where: { subscription: { userId } },
    select: { destination: { select: { id: true, slug: true, name: true } } },
    distinct: ["destinationId"],
  });
  if (subs.length === 0) return [];

  const results: FinishedTrip[] = [];
  for (const { destination } of subs) {
    const logistics = await prisma.tripLogistic.findMany({
      where: { userId, destinationId: destination.id, OR: [{ startsAt: { not: null } }, { endsAt: { not: null } }] },
      select: { startsAt: true, endsAt: true },
    });
    const dates = logistics.flatMap((l) => [l.endsAt, l.startsAt]).filter((d): d is Date => d != null);
    if (dates.length === 0) continue;
    const latest = new Date(Math.max(...dates.map((d) => d.getTime())));
    if (latest.getTime() < Date.now()) {
      results.push({
        destinationId: destination.id,
        destinationSlug: destination.slug,
        destinationName: destination.name,
        flag: COUNTRY_BY_SLUG[destination.slug]?.flag ?? null,
        endedAt: latest,
      });
    }
  }
  return results.sort((a, b) => b.endedAt.getTime() - a.endedAt.getTime());
}

export type TripWrappedStats = {
  destinationName: string;
  flag: string | null;
  daysTraveled: number;
  photosCount: number;
  highlightPhotos: string[];
  kmWalked: number;
  spentCents: number;
  poisFavorited: number;
  quizBestPct: number | null;
  pointsEarned: number;
};

export async function getTripWrappedStats(userId: string, destinationId: string): Promise<TripWrappedStats> {
  const [destination, highlightMedia, photosCount, pings, expenseTotal, poisFavorited, quizAttempts, logistics, budget] =
    await Promise.all([
      prisma.destination.findUniqueOrThrow({ where: { id: destinationId }, select: { name: true, slug: true } }),
      prisma.albumMedia.findMany({
        where: { userId, destinationId, type: "photo" },
        orderBy: { createdAt: "desc" },
        take: 6,
        select: { url: true },
      }),
      prisma.albumMedia.count({ where: { userId, destinationId, type: "photo" } }),
      prisma.locationPing.findMany({ where: { userId, destinationId }, orderBy: { recordedAt: "asc" }, select: { lat: true, lng: true } }),
      prisma.expense.aggregate({ where: { userId, destinationId }, _sum: { amountCents: true } }),
      prisma.favorite.count({ where: { userId, poi: { category: { area: { destinationId } } } } }),
      prisma.quizAttempt.findMany({ where: { userId, destinationId }, select: { score: true, totalQuestions: true } }),
      prisma.tripLogistic.findMany({ where: { userId, destinationId }, select: { startsAt: true, endsAt: true } }),
      prisma.tripBudget.findUnique({ where: { userId_destinationId: { userId, destinationId } }, select: { tripDays: true } }),
    ]);

  let kmWalked = 0;
  for (let i = 1; i < pings.length; i++) {
    kmWalked += haversineKm([pings[i - 1].lat, pings[i - 1].lng], [pings[i].lat, pings[i].lng]);
  }

  const logisticDates = logistics.flatMap((l) => [l.startsAt, l.endsAt]).filter((d): d is Date => d != null);
  const daysTraveled =
    logisticDates.length >= 2
      ? Math.max(1, Math.round((Math.max(...logisticDates.map((d) => d.getTime())) - Math.min(...logisticDates.map((d) => d.getTime()))) / 86400000) + 1)
      : (budget?.tripDays ?? 1);

  const quizBestPct = quizAttempts.length
    ? Math.round(Math.max(...quizAttempts.map((a) => (a.totalQuestions > 0 ? (a.score / a.totalQuestions) * 100 : 0))))
    : null;

  const pointsEarned = photosCount * 1 + poisFavorited * 3 + Math.round(kmWalked) + (quizBestPct ?? 0) / 5;

  return {
    destinationName: destination.name,
    flag: COUNTRY_BY_SLUG[destination.slug]?.flag ?? null,
    daysTraveled,
    photosCount,
    highlightPhotos: highlightMedia.map((m) => m.url),
    kmWalked: Math.round(kmWalked * 10) / 10,
    spentCents: expenseTotal._sum.amountCents ?? 0,
    poisFavorited,
    quizBestPct,
    pointsEarned: Math.round(pointsEarned),
  };
}
