import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { getDestinationBySlug } from "@/lib/data/destinations";
import { getFlatPoisForDestination, extractTextDescription } from "@/lib/data/pois";
import { getAccessLevel } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { createItineraryDay } from "@/lib/actions/trip";
import { UpgradeRequired } from "@/components/UpgradeRequired";
import { DayRouteMap, type MapDay } from "@/components/map/DayRouteMap";
import { ExportPdfButton } from "./ExportPdfButton";
import { ItineraryWizard } from "./ItineraryWizard";
import { ItineraryDaysView } from "./ItineraryDaysView";

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

  const [itinerary, pois, areas] = await Promise.all([
    prisma.itinerary.findUnique({
      where: { userId_destinationId_kind: { userId, destinationId: destination.id, kind: "personal" } },
      include: {
        days: {
          orderBy: { dayIndex: "asc" },
          include: { items: { orderBy: { order: "asc" }, include: { poi: { include: { photos: { take: 1 } } } } } },
        },
      },
    }),
    getFlatPoisForDestination(destination.id),
    prisma.area.findMany({ where: { destinationId: destination.id }, select: { id: true, name: true } }),
  ]);

  const poiOptions = pois.map((p) => ({ id: p.id, name: p.name, areaName: p.areaName, categoryName: p.categoryName }));
  const categoryNames = Array.from(new Set(pois.map((p) => p.categoryName))).sort();
  const createDayAction = createItineraryDay.bind(null, destination.id, slug);
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
      })),
  }));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold">📅 מתכנן מסלול יומי</h1>
        <div className="flex flex-wrap gap-2">
          <form action={createDayAction}>
            <button
              type="submit"
              className="rounded-full px-4 py-2 text-sm font-semibold text-white"
              style={{ background: "var(--primary)" }}
            >
              + הוספת יום
            </button>
          </form>
          {hasExistingDays && <ExportPdfButton destinationId={destination.id} slug={slug} />}
        </div>
      </div>

      <ItineraryWizard
        destinationId={destination.id}
        slug={slug}
        categories={categoryNames}
        areas={areas}
        hasExistingDays={hasExistingDays}
      />

      {(!itinerary || itinerary.days.length === 0) && (
        <p className="text-sm opacity-60">עדיין אין ימים במסלול. לחצו על &quot;הוספת יום&quot; או השתמשו בבנאי האוטומטי כדי להתחיל.</p>
      )}

      {/* Desktop: itinerary (narrower, tall) beside the route map, same
       * height, side-by-side instead of stacked — planning a day next to its
       * route reads much better than scrolling between two stacked blocks.
       * `dir="rtl"` on <html> makes flex-row's first child (the itinerary)
       * render on the physical right, matching the requested layout.
       * Mobile keeps the original stacked order untouched (no lg: classes
       * apply below 1024px). */}
      <div className="flex flex-col gap-6 lg:h-[calc(100vh-260px)] lg:min-h-[480px] lg:flex-row lg:items-stretch">
        <div className="lg:min-h-0 lg:w-[420px] lg:shrink-0">
          <ItineraryDaysView
            slug={slug}
            poiOptions={poiOptions}
            days={(itinerary?.days ?? []).map((day) => ({
              id: day.id,
              dayIndex: day.dayIndex,
              items: day.items.map((i) => ({
                id: i.id,
                timeOfDay: i.timeOfDay,
                customLabel: i.customLabel,
                note: i.note,
                poi: i.poi ? { name: i.poi.name, photoUrl: i.poi.photos[0]?.url ?? null } : null,
              })),
            }))}
          />
        </div>

        {mapDays.some((d) => d.points.length > 0) && (
          <div className="lg:min-h-0 lg:flex-1">
            <DayRouteMap days={mapDays} fillHeight />
          </div>
        )}
      </div>
    </div>
  );
}
