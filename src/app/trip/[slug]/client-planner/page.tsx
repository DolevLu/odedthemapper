import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { getDestinationBySlug } from "@/lib/data/destinations";
import { getFlatPoisForDestination, extractTextDescription } from "@/lib/data/pois";
import { getAccessLevel } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { UpgradeRequired } from "@/components/UpgradeRequired";
import { createClientItineraryDay, removeItineraryItem } from "@/lib/actions/trip";
import { colorForDay } from "@/lib/geo";
import { AddClientItem } from "./AddClientItem";
import { DayRouteMap, type MapDay } from "@/components/map/DayRouteMap";
import { OptimizeButton } from "./OptimizeButton";
import { ShareLink } from "../itinerary/ShareLink";
import { PlannerBrandingForm } from "./PlannerBrandingForm";
import { TemplateManager } from "./TemplateManager";

export default async function ClientPlannerPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const destination = await getDestinationBySlug(slug);
  if (!destination) notFound();

  const session = await auth();
  const accessLevel = await getAccessLevel(session?.user?.id, destination.id);
  if (accessLevel !== "gold") {
    if (!session?.user?.id) redirect(`/login?callbackUrl=${encodeURIComponent(`/trip/${slug}/client-planner`)}`);
    return <UpgradeRequired tier="gold" />;
  }

  const userId = session!.user!.id;

  const [itinerary, pois, plannerProfile, templates] = await Promise.all([
    prisma.itinerary.findUnique({
      where: { userId_destinationId_kind: { userId, destinationId: destination.id, kind: "client" } },
      include: {
        days: {
          orderBy: { dayIndex: "asc" },
          include: {
            items: { orderBy: { order: "asc" }, include: { poi: { include: { photos: { take: 1 } } } } },
          },
        },
      },
    }),
    getFlatPoisForDestination(destination.id),
    prisma.plannerProfile.findUnique({ where: { userId } }),
    prisma.itineraryTemplate.findMany({
      where: { userId, destinationId: destination.id, kind: "client" },
      orderBy: { createdAt: "desc" },
      select: { id: true, name: true },
    }),
  ]);

  const poiOptions = pois.map((p) => ({ id: p.id, name: p.name, areaName: p.areaName, categoryName: p.categoryName }));
  const createDayAction = createClientItineraryDay.bind(null, destination.id, slug);

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

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">🧑‍💼 תכנון מסלול ללקוח</h1>
          <p className="text-sm opacity-70">כלי מקצועי למתכנני טיולים - ימים, שעות, אופטימיזציה ותצוגת מפה.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <form action={createDayAction}>
            <button type="submit" className="rounded-full px-4 py-2 text-sm font-semibold text-white" style={{ background: "var(--primary)" }}>
              + הוספת יום
            </button>
          </form>
          {itinerary && itinerary.days.length > 1 && <OptimizeButton itineraryId={itinerary.id} slug={slug} />}
        </div>
      </div>

      <PlannerBrandingForm slug={slug} companyName={plannerProfile?.companyName ?? null} logoUrl={plannerProfile?.logoUrl ?? null} />

      <TemplateManager destinationId={destination.id} slug={slug} templates={templates} hasItinerary={Boolean(itinerary && itinerary.days.length > 0)} />

      {itinerary && <ShareLink destinationId={destination.id} slug={slug} shareToken={itinerary.shareToken} kind="client" path="client-planner" />}

      {(!itinerary || itinerary.days.length === 0) && (
        <p className="text-sm opacity-60">עדיין אין ימים במסלול. לחצו על &quot;הוספת יום&quot; כדי להתחיל.</p>
      )}

      {mapDays.some((d) => d.points.length > 0) && <DayRouteMap days={mapDays} />}

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

            <div className="flex flex-col gap-2">
              {day.items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-3 rounded-lg border p-2"
                  style={{ borderColor: "color-mix(in srgb, var(--primary) 25%, transparent)" }}
                >
                  {item.poi?.photos[0] && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.poi.photos[0].url} alt="" className="h-12 w-12 shrink-0 rounded-lg object-cover" />
                  )}
                  <div className="flex-1 text-sm">
                    {item.timeOfDay && <span className="me-2 font-mono text-xs opacity-70">{item.timeOfDay}</span>}
                    <span>{item.poi ? item.poi.name : item.customLabel}</span>
                    {!item.poi && <span className="ms-2 text-xs opacity-50">(פריט חופשי)</span>}
                  </div>
                  <form action={removeItineraryItem.bind(null, item.id, slug)}>
                    <button className="opacity-50 hover:opacity-100">✕</button>
                  </form>
                </div>
              ))}
              {day.items.length === 0 && <p className="text-xs opacity-50">אין עדיין נקודות ביום הזה.</p>}
            </div>

            <AddClientItem dayId={day.id} slug={slug} pois={poiOptions} />
          </div>
        ))}
      </div>
    </div>
  );
}
