import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { getDestinationBySlug } from "@/lib/data/destinations";
import { getFlatPoisForDestination, extractTextDescription } from "@/lib/data/pois";
import { getAccessLevel } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { createItineraryDay } from "@/lib/actions/trip";
import { UpgradeRequired } from "@/components/UpgradeRequired";
import { DayRouteMap, type MapDay } from "@/components/map/DayRouteMap";
import { colorForDay } from "@/lib/geo";
import { AddItemToDay } from "./AddItemToDay";
import { ExportPdfButton } from "./ExportPdfButton";
import { ItineraryWizard } from "./ItineraryWizard";
import { DayItemsList } from "./DayItemsList";

export default async function ItineraryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const destination = await getDestinationBySlug(slug);
  if (!destination) notFound();

  const session = await auth();
  const accessLevel = await getAccessLevel(session?.user?.id, destination.id);
  if (accessLevel === "none") return <UpgradeRequired tier="silver" />;

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

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {itinerary?.days.map((day) => (
          <div
            key={day.id}
            className="flex flex-col gap-3 border p-4"
            style={{ borderRadius: "var(--radius)", borderColor: colorForDay(day.dayIndex - 1), borderWidth: 2, background: "var(--surface)" }}
          >
            <h2 className="flex items-center gap-2 font-bold">
              <span className="h-3 w-3 rounded-full" style={{ background: colorForDay(day.dayIndex - 1) }} />
              יום {day.dayIndex}
            </h2>

            <DayItemsList
              dayId={day.id}
              slug={slug}
              path="itinerary"
              items={day.items.map((i) => ({
                id: i.id,
                timeOfDay: i.timeOfDay,
                customLabel: i.customLabel,
                poi: i.poi ? { name: i.poi.name, photoUrl: i.poi.photos[0]?.url ?? null } : null,
              }))}
            />

            <AddItemToDay dayId={day.id} slug={slug} pois={poiOptions} />
          </div>
        ))}
      </div>

      {mapDays.some((d) => d.points.length > 0) && <DayRouteMap days={mapDays} />}
    </div>
  );
}
