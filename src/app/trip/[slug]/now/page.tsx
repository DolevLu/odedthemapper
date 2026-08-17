import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { getDestinationBySlug } from "@/lib/data/destinations";
import { getFlatPoisForDestination } from "@/lib/data/pois";
import { getAccessLevel } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { UpgradeRequired } from "@/components/UpgradeRequired";
import { NowScreen } from "../NowScreen";

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export default async function TripNowPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const destination = await getDestinationBySlug(slug);
  if (!destination) notFound();

  const session = await auth();
  const accessLevel = await getAccessLevel(session?.user?.id, destination.id);
  if (accessLevel === "none") {
    if (!session?.user?.id) redirect(`/login?callbackUrl=${encodeURIComponent(`/trip/${slug}/now`)}`);
    return <UpgradeRequired tier="silver" />;
  }

  const userId = session!.user!.id;

  const [pois, favorites, logistics, itinerary, bookablePois] = await Promise.all([
    getFlatPoisForDestination(destination.id),
    prisma.favorite.findMany({ where: { userId }, select: { poiId: true } }),
    prisma.tripLogistic.findMany({
      where: { userId, destinationId: destination.id, startsAt: { not: null } },
      orderBy: { startsAt: "asc" },
    }),
    prisma.itinerary.findUnique({
      where: { userId_destinationId_kind: { userId, destinationId: destination.id, kind: "personal" } },
      include: { days: { orderBy: { dayIndex: "asc" }, include: { items: { orderBy: { order: "asc" }, include: { poi: true } } } } },
    }),
    prisma.pointOfInterest.findMany({
      where: { wantsBooking: true, category: { area: { destinationId: destination.id } } },
      select: { id: true, name: true },
      take: 5,
    }),
  ]);

  const categoryNames = Array.from(new Set(pois.map((p) => p.categoryName))).sort();
  const favoritedIds = new Set(favorites.map((f) => f.poiId));
  const scheduledPoiIds = new Set(
    (itinerary?.days ?? []).flatMap((day) => day.items.map((i) => i.poiId).filter((id): id is string => Boolean(id)))
  );

  const today = startOfDay(new Date());
  const tripStart = logistics[0]?.startsAt ? startOfDay(logistics[0].startsAt) : null;
  const tripEnd = logistics.length > 0 ? startOfDay(logistics[logistics.length - 1].endsAt ?? logistics[logistics.length - 1].startsAt!) : null;

  let daysUntil: number | null = null;
  let todayDayItems: { time: string | null; label: string }[] | null = null;

  if (tripStart) {
    const diffDays = Math.round((tripStart.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays > 0) {
      daysUntil = diffDays;
    } else if (tripEnd && today <= tripEnd) {
      const dayIndex = Math.round((today.getTime() - tripStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      const day = itinerary?.days.find((d) => d.dayIndex === dayIndex);
      if (day) {
        todayDayItems = day.items.map((item) => ({ time: item.timeOfDay, label: item.poi?.name ?? item.customLabel ?? "" }));
      }
    }
  }

  return (
    <NowScreen
      pois={pois}
      categoryNames={categoryNames}
      slug={slug}
      favoritedIds={favoritedIds}
      scheduledPoiIds={scheduledPoiIds}
      today={{
        destinationId: destination.id,
        destinationName: destination.name,
        heroImage: destination.heroImage,
        hasTargetDate: Boolean(tripStart),
        daysUntil,
        targetDateLabel: tripStart ? tripStart.toLocaleDateString("he-IL") : null,
        todayDayItems,
        bookableItems: bookablePois,
      }}
    />
  );
}
