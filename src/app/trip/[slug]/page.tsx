import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { getDestinationBySlug } from "@/lib/data/destinations";
import { getFlatPoisForDestination } from "@/lib/data/pois";
import { getAccessLevel } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { UpgradeRequired } from "@/components/UpgradeRequired";
import { MapScreen } from "./map/MapScreen";

export default async function TripHomePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const destination = await getDestinationBySlug(slug);
  if (!destination) notFound();

  const session = await auth();
  const accessLevel = await getAccessLevel(session?.user?.id, destination.id);
  if (accessLevel === "none") return <UpgradeRequired tier="silver" />;

  const [pois, favorites, logisticPinRows, trail] = await Promise.all([
    getFlatPoisForDestination(destination.id),
    prisma.favorite.findMany({ where: { userId: session!.user!.id }, select: { poiId: true } }),
    prisma.tripLogistic.findMany({
      where: { userId: session!.user!.id, destinationId: destination.id, lat: { not: null }, lng: { not: null } },
    }),
    prisma.locationPing.findMany({
      where: { userId: session!.user!.id, destinationId: destination.id },
      orderBy: { recordedAt: "asc" },
      select: { lat: true, lng: true },
    }),
  ]);

  const categoryNames = Array.from(new Set(pois.map((p) => p.categoryName))).sort();
  const favoritedIds = new Set(favorites.map((f) => f.poiId));
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
      logisticPins={logisticPins}
      destinationId={destination.id}
      initialTrail={trail}
    />
  );
}
