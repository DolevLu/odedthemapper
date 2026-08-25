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

  const [pois, favorites, logistics, itinerary, bookingChecks] = await Promise.all([
    getFlatPoisForDestination(destination.id),
    prisma.favorite.findMany({ where: { userId }, select: { poiId: true } }),
    prisma.tripLogistic.findMany({
      where: { userId, destinationId: destination.id, startsAt: { not: null } },
      orderBy: { startsAt: "asc" },
    }),
    prisma.itinerary.findUnique({
      where: { userId_destinationId_kind: { userId, destinationId: destination.id, kind: "personal" } },
      include: {
        days: {
          orderBy: { dayIndex: "asc" },
          include: { items: { orderBy: { order: "asc" }, include: { poi: { select: { id: true, name: true } } } } },
        },
      },
    }),
    // Both "✓ הוזמן" and "✗ לא מעניין" are personal dismissals (see
    // TodayCard's markHandled) — wantsBooking itself is a shared,
    // destination-wide flag (anyone can propose a place to book, per the map's
    // own 🎟️ toggle), so one user booking or dismissing a place must never
    // remove it from everyone else's list, only their own.
    prisma.packingCheck.findMany({
      where: { userId, destinationId: destination.id, itemKey: { startsWith: "booking" } },
      select: { itemKey: true },
    }),
  ]);

  const handledPoiIds = bookingChecks.map((c) => c.itemKey.replace(/^booking(-dismissed)?:/, ""));
  const bookablePois = await prisma.pointOfInterest.findMany({
    where: {
      wantsBooking: true,
      category: { area: { destinationId: destination.id } },
      ...(handledPoiIds.length > 0 ? { id: { notIn: handledPoiIds } } : {}),
    },
    select: { id: true, name: true },
    take: 5,
  });

  const categoryNames = Array.from(new Set(pois.map((p) => p.categoryName))).sort();
  const favoritedIds = new Set(favorites.map((f) => f.poiId));
  const scheduledPoiIds = new Set(
    (itinerary?.days ?? []).flatMap((day) => day.items.map((i) => i.poiId).filter((id): id is string => Boolean(id)))
  );

  const today = startOfDay(new Date());
  // Full timestamp (not truncated to midnight) so the Now screen can show a
  // real days/hours/minutes countdown, not just a day count.
  const tripStartExact = logistics[0]?.startsAt ?? null;
  const tripStart = tripStartExact ? startOfDay(tripStartExact) : null;
  const tripEnd = logistics.length > 0 ? startOfDay(logistics[logistics.length - 1].endsAt ?? logistics[logistics.length - 1].startsAt!) : null;

  let todayDayItems: { time: string | null; label: string }[] | null = null;

  if (tripStart) {
    const diffDays = Math.round((tripStart.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays <= 0 && tripEnd && today <= tripEnd) {
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
        logisticId: logistics[0]?.id ?? null,
        targetDateTimeIso: tripStartExact ? tripStartExact.toISOString() : null,
        todayDayItems,
        bookableItems: bookablePois,
      }}
    />
  );
}
