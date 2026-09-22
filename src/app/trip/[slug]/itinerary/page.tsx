import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { getDestinationBySlug } from "@/lib/data/destinations";
import { getPoiOptionsForDestination, getFlatPoisForDestination, extractTextDescription } from "@/lib/data/pois";
import type { OtherPoi } from "@/components/map/DayRouteMap";
import { getAccessLevel, resolveItineraryOwnerId } from "@/lib/access";
import { resolveEffectiveTodayDayIndex } from "@/lib/tripSchedule";
import { prisma } from "@/lib/prisma";
import { listItineraryTemplates, getItineraryTemplatePreview } from "@/lib/actions/trip";
import { UpgradeRequired } from "@/components/UpgradeRequired";
import type { MapDay } from "@/components/map/DayRouteMap";
import { ItineraryTopBar } from "./ItineraryTopBar";
import { ItineraryWizard } from "./ItineraryWizard";
import { ItineraryLayoutSwitcher } from "./ItineraryLayoutSwitcher";
import { ItineraryTemplatePreview } from "./ItineraryTemplatePreview";
import { getServerT } from "@/lib/i18n/server";

export default async function ItineraryPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ previewTemplate?: string }>;
}) {
  const { slug } = await params;
  const { previewTemplate } = await searchParams;
  const [destination, session] = await Promise.all([getDestinationBySlug(slug), auth()]);
  if (!destination) notFound();
  const accessLevel = await getAccessLevel(session?.user?.id, destination.id);
  if (accessLevel === "none") {
    if (!session?.user?.id) redirect(`/login?callbackUrl=${encodeURIComponent(`/trip/${slug}/itinerary`)}`);
    return <UpgradeRequired tier="silver" />;
  }

  const userId = session!.user!.id;
  const ownerId = await resolveItineraryOwnerId(userId);
  const t = await getServerT();

  const [itinerary, poiOptions, areas, templates, logistics, flatPois] = await Promise.all([
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
    getPoiOptionsForDestination(destination.id),
    prisma.area.findMany({ where: { destinationId: destination.id }, select: { id: true, name: true } }),
    listItineraryTemplates(destination.id, "personal"),
    // Same userId (not ownerId) the Now screen keys its own trip-start
    // lookup on, so the two screens agree on which single day is "today"
    // instead of each computing it a different way (see resolveEffectiveTodayDayIndex).
    prisma.tripLogistic.findMany({ where: { userId, destinationId: destination.id, startsAt: { not: null } } }),
    // Every curated point on this destination's real map — see DayRouteMap's
    // own "other points" layer: small grey ghost dots showing what's nearby
    // while following the planned route, each revealing its real color/icon
    // and details on click. getFlatPoisForDestination is already Data-Cache
    // wrapped (1h revalidate, tag-invalidated on content edits), so this
    // costs nothing extra beyond the Map/Now screens already paying for it.
    getFlatPoisForDestination(destination.id),
  ]);
  const todayDayIndex = resolveEffectiveTodayDayIndex(
    logistics,
    itinerary?.days.map((d) => d.dayIndex) ?? [],
    itinerary?.days.map((d) => ({ dayIndex: d.dayIndex, date: d.date })) ?? []
  );

  const categoryNames = Array.from(new Set(poiOptions.map((p) => p.categoryName))).sort();
  const hasExistingDays = Boolean(itinerary && itinerary.days.length > 0);

  // A saved route being viewed (not applied) — see ItineraryTopBar's
  // "📂 שמורים" list, which now navigates here with ?previewTemplate=
  // instead of overwriting the active itinerary on click.
  const templatePreview = previewTemplate ? await getItineraryTemplatePreview(previewTemplate, "personal") : null;
  if (previewTemplate && templatePreview) {
    return (
      <div className="flex flex-col gap-6 p-6">
        <ItineraryTemplatePreview slug={slug} destinationId={destination.id} templateId={previewTemplate} preview={templatePreview} hasExistingDays={hasExistingDays} />
      </div>
    );
  }

  const mapDays: MapDay[] = (itinerary?.days ?? []).map((day) => ({
    dayIndex: day.dayIndex,
    // A custom item only joins the route once it actually has a location
    // (a Google Places pick or a manually dropped pin — see AddItemToDay);
    // a plain free-text label stays list-only, same as before those
    // existed. Iterating every item (not filtering to i.poi first) keeps
    // custom stops in their real day order instead of always trailing
    // after every POI-backed one.
    points: day.items.flatMap((i): MapDay["points"] => {
      if (i.poi) {
        return [
          {
            id: i.id,
            name: i.poi.name,
            lat: i.poi.lat,
            lng: i.poi.lng,
            description: extractTextDescription(i.poi.rawDescriptionHtml),
            photoUrl: i.poi.photos[0]?.url ?? null,
            timeOfDay: i.timeOfDay,
          },
        ];
      }
      if (i.customLat != null && i.customLng != null) {
        return [{ id: i.id, name: i.customLabel ?? t("itinerary.unnamedPoint"), lat: i.customLat, lng: i.customLng, description: null, photoUrl: null, timeOfDay: i.timeOfDay }];
      }
      return [];
    }),
  }));

  // The "planned route" IDs (real POI ids only — a custom hand-dropped stop
  // has no corresponding flatPois entry to duplicate anyway) get excluded
  // from the ghost layer below, so a point already shown as a big numbered
  // stop never ALSO shows as a small grey dot sitting right on top of it.
  const plannedPoiIds = new Set((itinerary?.days ?? []).flatMap((day) => day.items.flatMap((i) => (i.poi ? [i.poiId!] : []))));
  const otherPois: OtherPoi[] = flatPois
    .filter((p) => p.geometryType === "point" && !plannedPoiIds.has(p.id))
    .map((p) => ({
      id: p.id,
      name: p.name,
      lat: p.lat,
      lng: p.lng,
      categoryName: p.categoryName,
      categoryColor: p.categoryColor,
      colorHex: p.colorHex,
      iconCategory: p.iconCategory,
      photoUrl: p.photoUrl,
      description: p.description,
    }));

  const dayListDays = (itinerary?.days ?? []).map((day) => ({
    id: day.id,
    dayIndex: day.dayIndex,
    // ISO "YYYY-MM-DD" (not a Date instance) — matches <input type="date">'s
    // own value format directly and avoids passing a non-serializable Date
    // from a server component down to client components.
    date: day.date ? day.date.toISOString().slice(0, 10) : null,
    items: day.items.map((i) => ({
      id: i.id,
      timeOfDay: i.timeOfDay,
      customLabel: i.customLabel,
      customLat: i.customLat,
      customLng: i.customLng,
      note: i.note,
      poi: i.poi
        ? {
            name: i.poi.name,
            lat: i.poi.lat,
            lng: i.poi.lng,
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
    // h-screen (not h-full): body/main only set min-height, never an actual
    // capped height, so a percentage h-full here resolves against an
    // uncapped ancestor and just grows to fit content instead of being
    // bounded — harmless for the map screen (Google Maps has no intrinsic
    // content size to grow with), but a real bug here once a day's item
    // list is long enough to have genuine height of its own: the whole page
    // grew and scrolled instead of just this panel. h-screen is an absolute
    // viewport value, immune to that — correct here since nothing (no
    // header) sits above the sidebar+content row.
    <div className={hasExistingDays ? "flex h-screen flex-col" : "flex flex-col gap-6 p-6"}>
      {/* Once there's an itinerary to show, both mobile (its own draggable
       * drawer) and desktop (ItineraryLayoutSwitcher's own toolbar, over its
       * full-bleed side-panel+map view) render their own copy of this same
       * top bar instead — this in-flow onboarding header would otherwise
       * double up with it. Only shown here for the "nothing built yet" state,
       * on every screen size. */}
      {!hasExistingDays && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h1 className="text-xl font-bold">{t("itinerary.plannerTitle")}</h1>
            <div className="flex flex-wrap items-center gap-1.5">
              <ItineraryTopBar destinationId={destination.id} slug={slug} hasExistingDays={hasExistingDays} templates={templates} />
            </div>
          </div>

          <ItineraryWizard
            destinationId={destination.id}
            slug={slug}
            categories={categoryNames}
            areas={areas}
            hasExistingDays={hasExistingDays}
          />

          <p className="text-sm opacity-60">{t("itinerary.emptyState")}</p>
        </>
      )}

      {/* Desktop (once there are days): a docked full-height side panel next
       * to the route map, filling the whole content area edge-to-edge, with
       * its own pill toolbar up top — see ItineraryLayoutSwitcher. Mobile:
       * full-screen map with the day's stop list in a draggable bottom
       * drawer (ItineraryMobileView). */}
      <ItineraryLayoutSwitcher
        slug={slug}
        destinationId={destination.id}
        hasExistingDays={hasExistingDays}
        templates={templates}
        mapDays={mapDays}
        dayListDays={dayListDays}
        poiOptions={poiOptions}
        categoryNames={categoryNames}
        areas={areas}
        todayDayIndex={todayDayIndex}
        otherPois={otherPois}
      />
    </div>
  );
}
