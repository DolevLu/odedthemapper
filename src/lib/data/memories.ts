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

  const ownerId = await resolveItineraryOwnerId(userId);

  return Promise.all(
    log.map(async (entry) => {
      const destinationId = entry.destinationId;
      const [dayCount, photoCount, ratedCount, hotelCount, liveAccess] = await Promise.all([
        prisma.itineraryDay.count({ where: { itinerary: { userId: ownerId, destinationId, kind: "personal" } } }),
        prisma.albumMedia.count({ where: { userId, destinationId } }),
        prisma.poiRating.count({ where: { userId, poi: { category: { area: { destinationId } } } } }),
        prisma.tripLogistic.count({ where: { userId, destinationId, type: "hotel" } }),
        hasAccessToDestination(userId, destinationId),
      ]);
      return {
        destinationId,
        slug: entry.destination.slug,
        name: entry.destination.name,
        heroImage: entry.destination.heroImage,
        firstAccessAt: entry.firstAccessAt,
        hasLiveAccess: liveAccess,
        dayCount,
        photoCount,
        ratedCount,
        hotelCount,
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

