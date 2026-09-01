import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { getDestinationBySlug } from "@/lib/data/destinations";
import { getAccessLevel, resolveItineraryOwnerId } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { UpgradeRequired } from "@/components/UpgradeRequired";
import { SwipeBuilder } from "./SwipeBuilder";

// Only a light query here — category names + which POIs/days already exist —
// so this page loads instantly regardless of destination size. The actual
// swipe deck (which can be a couple thousand POIs' worth of data for a big
// destination) is fetched on demand via buildSwipeDeck() once the setup step
// is submitted, not shipped up front.
export default async function ItineraryBuilderPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [destination, session] = await Promise.all([getDestinationBySlug(slug), auth()]);
  if (!destination) notFound();
  const accessLevel = await getAccessLevel(session?.user?.id, destination.id);
  if (accessLevel === "none") {
    if (!session?.user?.id) redirect(`/login?callbackUrl=${encodeURIComponent(`/trip/${slug}/itinerary/builder`)}`);
    return <UpgradeRequired tier="silver" />;
  }

  const ownerId = await resolveItineraryOwnerId(session!.user!.id);

  const [categoryRows, existingItinerary] = await Promise.all([
    prisma.category.findMany({ where: { area: { destinationId: destination.id } }, select: { name: true } }),
    prisma.itinerary.findUnique({
      where: { userId_destinationId_kind: { userId: ownerId, destinationId: destination.id, kind: "personal" } },
      include: { days: { orderBy: { dayIndex: "asc" }, select: { dayIndex: true, _count: { select: { items: true } }, items: { select: { poiId: true } } } } },
    }),
  ]);

  const categoryNames = Array.from(new Set(categoryRows.map((c) => c.name))).sort();
  const excludePoiIds = (existingItinerary?.days ?? [])
    .flatMap((d) => d.items.map((i) => i.poiId))
    .filter((id): id is string => Boolean(id));
  const existingDayCount = existingItinerary?.days.length ?? 0;
  const existingDayItemCounts = (existingItinerary?.days ?? []).map((d) => d._count.items);

  return (
    <SwipeBuilder
      destinationId={destination.id}
      destinationName={destination.name}
      slug={slug}
      categories={categoryNames}
      excludePoiIds={excludePoiIds}
      initialDayCount={existingDayCount || 3}
      hasExistingDays={existingDayCount > 0}
      existingDayItemCounts={existingDayItemCounts}
    />
  );
}
