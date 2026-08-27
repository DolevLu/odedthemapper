import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { getDestinationBySlug } from "@/lib/data/destinations";
import { getFlatPoisForDestination, extractTextDescription } from "@/lib/data/pois";
import { getAccessLevel, resolveItineraryOwnerId } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { listItineraryTemplates } from "@/lib/actions/trip";
import { UpgradeRequired } from "@/components/UpgradeRequired";
import type { MapDay } from "@/components/map/DayRouteMap";
import { ExportPdfButton } from "./ExportPdfButton";
import { ItineraryTopBar } from "./ItineraryTopBar";
import { ItineraryWizard } from "./ItineraryWizard";
import { ItineraryLayoutSwitcher } from "./ItineraryLayoutSwitcher";

export default async function ItineraryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const destination = await getDestinationBySlug(slug);
  if (!destination) notFound();

  const session = await auth();
  const accessLevel = await getAccessLevel(session?.user?.id, destination.id);
  if (accessLevel === "none") {
    if (!session?.user?.id) redirect(`/login?callbackUrl=${encodeURIComponent(`/trip/${slug}/itinerary`)}`);
    return <UpgradeRequired tier="silver" />;
  }

  const userId = session!.user!.id;
  const ownerId = await resolveItineraryOwnerId(userId);

  const [itinerary, pois, areas, templates] = await Promise.all([
    prisma.itinerary.findUnique({
      where: { userId_destinationId_kind: { userId: ownerId, destinationId: destination.id, kind: "personal" } },
      include: {
        days: {
          orderBy: { dayIndex: "asc" },
          include: {
            items: {
              orderBy: { order: "asc" },
              include: {
                poi: { include: { photos: { take: 1 }, category: { select: { name: true } } } },
                votes: { select: { userId: true, value: true } },
              },
            },
          },
        },
      },
    }),
    getFlatPoisForDestination(destination.id),
    prisma.area.findMany({ where: { destinationId: destination.id }, select: { id: true, name: true } }),
    listItineraryTemplates(destination.id, "personal"),
  ]);

  const poiOptions = pois.map((p) => ({ id: p.id, name: p.name, areaName: p.areaName, categoryName: p.categoryName }));
  const categoryNames = Array.from(new Set(pois.map((p) => p.categoryName))).sort();
  const hasExistingDays = Boolean(itinerary && itinerary.days.length > 0);

  const mapDays: MapDay[] = (itinerary?.days ?? []).map((day) => ({
    dayIndex: day.dayIndex,
    points: day.items
      .filter((i) => i.poi)
      .map((i) => ({
        id: i.id,
        name: i.poi!.name,
        lat: i.poi!.lat,
        lng: i.poi!.lng,
        description: extractTextDescription(i.poi!.rawDescriptionHtml),
        photoUrl: i.poi!.photos[0]?.url ?? null,
        timeOfDay: i.timeOfDay,
      })),
  }));

  const dayListDays = (itinerary?.days ?? []).map((day) => ({
    id: day.id,
    dayIndex: day.dayIndex,
    items: day.items.map((i) => ({
      id: i.id,
      timeOfDay: i.timeOfDay,
      customLabel: i.customLabel,
      note: i.note,
      poi: i.poi
        ? {
            name: i.poi.name,
            photoUrl: i.poi.photos[0]?.url ?? null,
            categoryName: i.poi.category.name,
            description: extractTextDescription(i.poi.rawDescriptionHtml),
          }
        : null,
      likeCount: i.votes.filter((v) => v.value === 1).length,
      dislikeCount: i.votes.filter((v) => v.value === -1).length,
      myVote: (i.votes.find((v) => v.userId === userId)?.value ?? 0) as -1 | 0 | 1,
    })),
  }));

  return (
    <div className="flex flex-col gap-6">
      {/* Once there's an itinerary to show, mobile switches to the
       * full-screen map+drawer layout below (which floats its own compact
       * copy of this same top bar over the map) — this in-flow header would
       * otherwise just double up with it. Desktop keeps it in-flow always;
       * mobile still needs it when there's nothing to show yet. */}
      <div className={`flex-wrap items-center justify-between gap-3 sm:flex ${hasExistingDays ? "hidden" : "flex"}`}>
        <h1 className="text-xl font-bold">📅 מתכנן מסלול יומי</h1>
        <div className="flex flex-wrap items-center gap-1.5">
          <ItineraryTopBar destinationId={destination.id} slug={slug} hasExistingDays={hasExistingDays} templates={templates} />
          {hasExistingDays && <ExportPdfButton destinationId={destination.id} slug={slug} />}
        </div>
      </div>

      <div className={`sm:block ${hasExistingDays ? "hidden" : "block"}`}>
        <ItineraryWizard
          destinationId={destination.id}
          slug={slug}
          categories={categoryNames}
          areas={areas}
          hasExistingDays={hasExistingDays}
        />
      </div>

      {(!itinerary || itinerary.days.length === 0) && (
        <p className="text-sm opacity-60">עדיין אין ימים במסלול. לחצו על &quot;הוספת יום&quot; או השתמשו בבנאי האוטומטי כדי להתחיל.</p>
      )}

      {/* Desktop: itinerary (narrower, tall) beside the route map,
       * side-by-side. Mobile: full-screen map with the day's stop list in a
       * draggable bottom drawer (see ItineraryLayoutSwitcher). */}
      <ItineraryLayoutSwitcher
        slug={slug}
        destinationId={destination.id}
        hasExistingDays={hasExistingDays}
        templates={templates}
        mapDays={mapDays}
        dayListDays={dayListDays}
        poiOptions={poiOptions}
      />
    </div>
  );
}
