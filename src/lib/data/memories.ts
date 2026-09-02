import { prisma } from "@/lib/prisma";
import { hasAccessToDestination, resolveItineraryOwnerId } from "@/lib/access";

export type TripArchiveSummary = {
  destinationId: string;
  slug: string;
  name: string;
  heroImage: string | null;
  firstAccessAt: Date;
  hasLiveAccess: boolean;
  dayCount: number;
  photoCount: number;
  ratedCount: number;
  hotelCount: number;
};

/** Every destination this user has ever had real access to, oldest access
 * first ignored — newest first, read-only summary cards for the "הטיולים
 * שלי" hub. Backed by DestinationAccess (schema.prisma), a permanent log
 * that survives a destination swap or a lapsed subscription — this list
 * never shrinks just because live access changed. */
export async function getTripArchiveSummaries(userId: string): Promise<TripArchiveSummary[]> {
  const log = await prisma.destinationAccess.findMany({
    where: { userId },
    orderBy: { firstAccessAt: "desc" },
    include: { destination: { select: { id: true, slug: true, name: true, heroImage: true } } },
  });
  if (log.length === 0) return [];

  const destinationIds = log.map((e) => e.destinationId);
  const ownerId = await resolveItineraryOwnerId(userId);

  // Used to fire one Promise.all of 5 queries PER destination — fine with a
  // couple of destinations, but fatal once a real archive grows large
  // enough: confirmed directly against production, a 30-destination archive
  // fired 150 simultaneous connection requests on a single page load and
  // blew straight through Supabase's pooled connection limit ("FATAL: max
  // clients reached... pool_size: 15" — exactly the "trips couldn't load"
  // report this was chasing). Replaced with a small fixed number of
  // aggregate queries across every destination at once, so this scales to
  // any archive size instead of just raising the threshold. hasAccessTo-
  // Destination is left as one call per destination deliberately: its
  // underlying getActiveSubscription lookup is React cache()-wrapped, so
  // only the first call does real DB work — every other destination's call
  // resolves from that same cached result, not a fresh query.
  const [itineraries, albumCounts, ratingRows, hotelCounts] = await Promise.all([
    prisma.itinerary.findMany({
      where: { userId: ownerId, kind: "personal", destinationId: { in: destinationIds } },
      select: { destinationId: true, _count: { select: { days: true } } },
    }),
    prisma.albumMedia.groupBy({
      by: ["destinationId"],
      where: { userId, destinationId: { in: destinationIds } },
      _count: { _all: true },
    }),
    prisma.poiRating.findMany({
      where: { userId, poi: { category: { area: { destinationId: { in: destinationIds } } } } },
      select: { poi: { select: { category: { select: { area: { select: { destinationId: true } } } } } } },
    }),
    prisma.tripLogistic.groupBy({
      by: ["destinationId"],
      where: { userId, type: "hotel", destinationId: { in: destinationIds } },
      _count: { _all: true },
    }),
  ]);

  const dayCountByDest = new Map(itineraries.map((i) => [i.destinationId, i._count.days]));
  const albumCountByDest = new Map(albumCounts.map((a) => [a.destinationId, a._count._all]));
  const hotelCountByDest = new Map(hotelCounts.map((h) => [h.destinationId, h._count._all]));
  const ratedCountByDest = new Map<string, number>();
  for (const r of ratingRows) {
    const destId = r.poi.category.area.destinationId;
    ratedCountByDest.set(destId, (ratedCountByDest.get(destId) ?? 0) + 1);
  }

  return Promise.all(
    log.map(async (entry) => {
      const destinationId = entry.destinationId;
      return {
        destinationId,
        slug: entry.destination.slug,
        name: entry.destination.name,
        heroImage: entry.destination.heroImage,
        firstAccessAt: entry.firstAccessAt,
        hasLiveAccess: await hasAccessToDestination(userId, destinationId),
        dayCount: dayCountByDest.get(destinationId) ?? 0,
        photoCount: albumCountByDest.get(destinationId) ?? 0,
        ratedCount: ratedCountByDest.get(destinationId) ?? 0,
        hotelCount: hotelCountByDest.get(destinationId) ?? 0,
      };
    })
  );
}

export type TripArchiveDetail = {
  destinationId: string;
  slug: string;
  name: string;
  heroImage: string | null;
  hasLiveAccess: boolean;
  days: { dayIndex: number; items: { time: string | null; label: string; note: string | null }[] }[];
  photos: { id: string; type: string; url: string; caption: string | null }[];
  ratings: { poiId: string; poiName: string; categoryName: string; rating: number; note: string | null }[];
  hotels: { id: string; title: string; startsAt: Date | null; endsAt: Date | null; confirmationNumber: string | null }[];
  documents: { id: string; title: string; type: string; imageUrl: string; confirmationNumber: string | null }[];
  trail: { lat: number; lng: number }[];
};

/** Full read-only archive for one past (or current) destination. Requires a
 * DestinationAccess row to exist (proof the user genuinely had access here
 * at some point) — this is deliberately NOT gated by hasAccessToDestination,
 * since the entire point is that it keeps working after access lapses. */
export async function getTripArchiveDetail(userId: string, slug: string): Promise<TripArchiveDetail | null> {
  const access = await prisma.destinationAccess.findFirst({
    where: { userId, destination: { slug } },
    include: { destination: { select: { id: true, slug: true, name: true, heroImage: true } } },
  });
  if (!access) return null;

  const destinationId = access.destinationId;
  const ownerId = await resolveItineraryOwnerId(userId);

  const [itinerary, photos, ratingRows, logistics, trailRows, liveAccess] = await Promise.all([
    prisma.itinerary.findUnique({
      where: { userId_destinationId_kind: { userId: ownerId, destinationId, kind: "personal" } },
      include: { days: { orderBy: { dayIndex: "asc" }, include: { items: { orderBy: { order: "asc" }, include: { poi: { select: { name: true } } } } } } },
    }),
    prisma.albumMedia.findMany({ where: { userId, destinationId }, orderBy: { createdAt: "desc" } }),
    prisma.poiRating.findMany({
      where: { userId, poi: { category: { area: { destinationId } } } },
      orderBy: { updatedAt: "desc" },
      include: { poi: { select: { name: true, category: { select: { name: true } } } } },
    }),
    prisma.tripLogistic.findMany({ where: { userId, destinationId }, orderBy: { startsAt: "asc" } }),
    prisma.locationPing.findMany({ where: { userId, destinationId }, orderBy: { recordedAt: "asc" }, select: { lat: true, lng: true } }),
    hasAccessToDestination(userId, destinationId),
  ]);

  const days = (itinerary?.days ?? []).map((day) => ({
    dayIndex: day.dayIndex,
    items: day.items.map((item) => ({
      time: item.timeOfDay,
      label: item.customLabel ?? item.poi?.name ?? "עצירה",
      note: item.note,
    })),
  }));

  const ratings = ratingRows.map((r) => ({
    poiId: r.poiId,
    poiName: r.poi.name,
    categoryName: r.poi.category.name,
    rating: r.rating,
    note: r.note,
  }));

  const hotels = logistics
    .filter((l) => l.type === "hotel")
    .map((l) => {
      const details = JSON.parse(l.detailsJson) as { title?: string };
      return { id: l.id, title: details.title ?? "מלון", startsAt: l.startsAt, endsAt: l.endsAt, confirmationNumber: l.confirmationNumber };
    });

  const documents = logistics
    .filter((l) => l.imageUrl)
    .map((l) => {
      const details = JSON.parse(l.detailsJson) as { title?: string };
      return { id: l.id, title: details.title ?? l.type, type: l.type, imageUrl: l.imageUrl!, confirmationNumber: l.confirmationNumber };
    });

  return {
    destinationId,
    slug: access.destination.slug,
    name: access.destination.name,
    heroImage: access.destination.heroImage,
    hasLiveAccess: liveAccess,
    days,
    photos: photos.map((p) => ({ id: p.id, type: p.type, url: p.url, caption: p.caption })),
    ratings,
    hotels,
    documents,
    trail: trailRows,
  };
}

