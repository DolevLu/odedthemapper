"use client";

import { useRouter } from "next/navigation";
import { useIsDesktop } from "@/hooks/useIsDesktop";
import { moveItineraryItemToDay } from "@/lib/actions/trip";
import { DayRouteMap, type MapDay } from "@/components/map/DayRouteMap";
import { ItineraryDaysView } from "./ItineraryDaysView";
import type { DayListItem } from "./DayItemsList";
import { ItineraryMobileView } from "./ItineraryMobileView";

type Day = { id: string; dayIndex: number; items: DayListItem[] };
type PoiOption = { id: string; name: string; areaName: string; categoryName: string };
type Template = { id: string; name: string };

/** Picks between the mobile full-screen-map-with-drawer layout and the
 * desktop side-by-side one — see useIsDesktop for why this happens at the
 * component level instead of via responsive CSS classes on a single tree. */
export function ItineraryLayoutSwitcher({
  slug,
  destinationId,
  hasExistingDays,
  templates,
  mapDays,
  dayListDays,
  poiOptions,
  categoryNames,
  areas,
}: {
  slug: string;
  destinationId: string;
  hasExistingDays: boolean;
  templates: Template[];
  mapDays: MapDay[];
  dayListDays: Day[];
  poiOptions: PoiOption[];
  categoryNames: string[];
  areas: { id: string; name: string }[];
}) {
  const router = useRouter();
  const isDesktop = useIsDesktop();

  if (dayListDays.length === 0) return null;

  async function handleMoveToDay(itemId: string, dayIndex: number) {
    const result = await moveItineraryItemToDay(itemId, dayIndex, slug);
    if (result && "error" in result) {
      window.alert(result.error);
      return;
    }
    router.refresh();
  }

  if (!isDesktop) {
    return (
      <ItineraryMobileView
        slug={slug}
        destinationId={destinationId}
        hasExistingDays={hasExistingDays}
        templates={templates}
        mapDays={mapDays}
        dayListDays={dayListDays}
        poiOptions={poiOptions}
        categoryNames={categoryNames}
        areas={areas}
      />
    );
  }

  return (
    <div className="flex flex-col gap-6 lg:h-[calc(100vh-200px)] lg:min-h-[480px] lg:flex-row lg:items-stretch">
      <div className="lg:min-h-0 lg:w-[420px] lg:shrink-0">
        <ItineraryDaysView slug={slug} poiOptions={poiOptions} days={dayListDays} />
      </div>

      {mapDays.some((d) => d.points.length > 0) && (
        <div className="lg:min-h-0 lg:flex-1">
          <DayRouteMap days={mapDays} fillHeight onMoveToDay={handleMoveToDay} />
        </div>
      )}
    </div>
  );
}
