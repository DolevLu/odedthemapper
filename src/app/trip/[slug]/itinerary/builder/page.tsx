import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { getDestinationBySlug } from "@/lib/data/destinations";
import { getFlatPoisForDestination, extractTextDescription } from "@/lib/data/pois";
import { getAccessLevel, resolveItineraryOwnerId } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { UpgradeRequired } from "@/components/UpgradeRequired";
import { SwipeBuilder } from "./SwipeBuilder";

export default async function ItineraryBuilderPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const destination = await getDestinationBySlug(slug);
  if (!destination) notFound();

  const session = await auth();
  const accessLevel = await getAccessLevel(session?.user?.id, destination.id);
  if (accessLevel === "none") {
    if (!session?.user?.id) redirect(`/login?callbackUrl=${encodeURIComponent(`/trip/${slug}/itinerary/builder`)}`);
    return <UpgradeRequired tier="silver" />;
  }

  const ownerId = await resolveItineraryOwnerId(session!.user!.id);

  const [pois, existingItinerary] = await Promise.all([
    getFlatPoisForDestination(destination.id),
    prisma.itinerary.findUnique({
      where: { userId_destinationId_kind: { userId: ownerId, destinationId: destination.id, kind: "personal" } },
      include: { days: { select: { dayIndex: true, items: { select: { poiId: true } } } } },
    }),
  ]);

  const categoryNames = Array.from(new Set(pois.map((p) => p.categoryName))).sort();
  const excludePoiIds = (existingItinerary?.days ?? [])
    .flatMap((d) => d.items.map((i) => i.poiId))
    .filter((id): id is string => Boolean(id));
  const existingDayCount = existingItinerary?.days.length ?? 0;

  const cards = pois.map((p) => ({
    poiId: p.id,
    name: p.name,
    categoryName: p.categoryName,
    areaName: p.areaName,
    photoUrl: p.photoUrl,
    description: extractTextDescription(p.description, 160),
    tags: p.tags,
    isMustSee: p.isMustSee,
  }));

  return (
    <SwipeBuilder
      destinationId={destination.id}
      destinationName={destination.name}
      slug={slug}
      categories={categoryNames}
      cards={cards}
      excludePoiIds={excludePoiIds}
      initialDayCount={existingDayCount || 3}
    />
  );
}
