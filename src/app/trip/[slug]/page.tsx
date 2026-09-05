import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { getDestinationBySlug } from "@/lib/data/destinations";
import { getFlatPoisForDestination } from "@/lib/data/pois";
import { getAccessLevel, canManageContent, getActiveSubscriptionSummary } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { MapScreen } from "./map/MapScreen";
import { sortCategoryNames } from "@/lib/mapStyles";

export default async function TripHomePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [destination, session] = await Promise.all([getDestinationBySlug(slug), auth()]);
  if (!destination) notFound();
  const accessLevel = await getAccessLevel(session?.user?.id, destination.id);
  const userId = session?.user?.id;

  // Anonymous/unsubscribed visitors get a reduced, read-only map preview
  // instead of being blocked outright — there's no personal data (favorites,
  // logistics, GPS trail) to load for them, so those queries are simply
  // skipped rather than crashing on a missing userId.
  const isFullAccess = accessLevel !== "none";

  const [pois, favorites, ratings, logisticPinRows, trail, savedMapPins, nextFlight, isAdmin] = await Promise.all([
    getFlatPoisForDestination(destination.id),
    isFullAccess && userId ? prisma.favorite.findMany({ where: { userId }, select: { poiId: true } }) : Promise.resolve([]),
    isFullAccess && userId ? prisma.poiRating.findMany({ where: { userId }, select: { poiId: true, rating: true } }) : Promise.resolve([]),
    isFullAccess && userId
      ? prisma.tripLogistic.findMany({ where: { userId, destinationId: destination.id, lat: { not: null }, lng: { not: null } } })
      : Promise.resolve([]),
    isFullAccess && userId
      ? prisma.locationPing.findMany({
          where: { userId, destinationId: destination.id },
          orderBy: { recordedAt: "asc" },
          select: { lat: true, lng: true },
        })
      : Promise.resolve([]),
    isFullAccess && userId
      ? prisma.savedMapPin.findMany({ where: { userId, destinationId: destination.id } })
      : Promise.resolve([]),
    // Same "earliest logistics start" the Now screen's countdown uses — a
    // future flight date means the traveler isn't there yet, so their real
    // GPS position (wherever they currently are) isn't useful map context;
    // the map should default to an overview of the destination instead.
    isFullAccess && userId
      ? prisma.tripLogistic.findFirst({
          where: { userId, destinationId: destination.id, startsAt: { not: null } },
          orderBy: { startsAt: "asc" },
          select: { startsAt: true },
        })
      : Promise.resolve(null),
    userId ? canManageContent(userId) : Promise.resolve(false),
  ]);

  // Same computation as (shell)'s own layout.tsx uses for the sidebar's
  // ProfileMenu — needed again here because this screen embeds its own copy
  // inline in the search bar instead of using the sidebar's floating one
  // (see MapScreen's isLoggedIn/name/planLabel props).
  const summary = userId ? await getActiveSubscriptionSummary(userId) : null;
  const planLabel = summary ? summary.plan.name : session?.user ? "חינמי" : null;

  // Only auto-locates once a real flight is logged AND its date has passed —
  // no flight logged at all must NOT auto-locate (was `!nextFlight?.startsAt
  // || ...`, which defaulted to true with nothing logged, auto-centering on
  // the visitor's real GPS position instead of the destination overview for
  // every destination without trip dates set — the exact opposite of the
  // intended "destination overview by default, real position only once the
  // trip has actually started per a logged flight" behavior).
  const autoLocate = Boolean(nextFlight?.startsAt && nextFlight.startsAt.getTime() <= Date.now());

  const categoryNames = sortCategoryNames(Array.from(new Set(pois.map((p) => p.categoryName))));
  const favoritedIds = new Set(favorites.map((f) => f.poiId));
  const ratingsByPoiId = Object.fromEntries(ratings.map((r) => [r.poiId, r.rating]));
  const logisticPins = logisticPinRows.map((l) => {
    const details = JSON.parse(l.detailsJson) as { title: string };
    const dateRange = l.startsAt
      ? l.endsAt && l.endsAt.getTime() !== l.startsAt.getTime()
        ? `${l.startsAt.toLocaleDateString("he-IL")} — ${l.endsAt.toLocaleDateString("he-IL")}`
        : l.startsAt.toLocaleDateString("he-IL")
      : null;
    return { id: l.id, type: l.type, title: details.title, lat: l.lat!, lng: l.lng!, dateRange };
  });

  return (
    <MapScreen
      pois={pois}
      categoryNames={categoryNames}
      slug={slug}
      favoritedIds={favoritedIds}
      ratingsByPoiId={ratingsByPoiId}
      logisticPins={logisticPins}
      destinationId={destination.id}
      initialTrail={trail}
      savedPins={savedMapPins}
      preview={!isFullAccess}
      autoLocate={autoLocate}
      isAdmin={isAdmin}
      isLoggedIn={Boolean(session?.user?.id)}
      name={session?.user?.name ?? null}
      planLabel={planLabel}
    />
  );
}
