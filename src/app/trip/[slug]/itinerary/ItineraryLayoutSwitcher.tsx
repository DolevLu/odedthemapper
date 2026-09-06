"use client";

import { useRouter } from "next/navigation";
import { useIsDesktop } from "@/hooks/useIsDesktop";
import { moveItineraryItemToDay } from "@/lib/actions/trip";
import { DayRouteMap, type MapDay } from "@/components/map/DayRouteMap";
import { ItineraryDaysView } from "./ItineraryDaysView";
import type { DayListItem } from "./DayItemsList";
import { ItineraryMobileView } from "./ItineraryMobileView";
import { ItineraryTopBar } from "./ItineraryTopBar";
import { ItineraryWizard } from "./ItineraryWizard";
import { ExportPdfButton } from "./ExportPdfButton";

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
    <div className="flex h-full items-stretch">
      {/* Route actions + the day panel itself live in this one docked side
       * panel — no full-width banner sits above the map anymore (it used to
       * get both this toolbar AND DayRouteMap's own day-pill row as
       * block-level rows pushing it down). The map keeps its own small
       * floating day filter (see DayRouteMap) — that one overlays the map
       * itself rather than taking up separate space above it. */}
      <div
        className="flex h-full min-h-0 w-[420px] shrink-0 flex-col border-e"
        style={{ borderColor: "color-mix(in srgb, var(--text) 10%, transparent)", background: "var(--surface)" }}
      >
        <div className="flex flex-wrap shrink-0 items-center gap-1.5 border-b p-3" style={{ borderColor: "color-mix(in srgb, var(--text) 10%, transparent)" }}>
          <ItineraryTopBar destinationId={destinationId} slug={slug} hasExistingDays={hasExistingDays} templates={templates} />
          <ItineraryWizard destinationId={destinationId} slug={slug} categories={categoryNames} areas={areas} hasExistingDays={hasExistingDays} />
          <ExportPdfButton destinationId={destinationId} slug={slug} />
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          <ItineraryDaysView slug={slug} poiOptions={poiOptions} days={dayListDays} />
        </div>
      </div>

      {mapDays.some((d) => d.points.length > 0) && (
        <div className="min-h-0 flex-1">
          {/* DayRouteMap's day-pill filter now floats over the map itself
           * (see DayRouteMap) rather than sitting above it as a block-level
           * banner, so it no longer competes with this panel's own day
           * switcher for space — independent selections (map filter vs.
           * panel focus) is fine since they answer different questions
           * ("which route do I want to see" vs. "which day am I editing"). */}
          <DayRouteMap days={mapDays} fillHeight onMoveToDay={handleMoveToDay} />
        </div>
      )}
    </div>
  );
}
