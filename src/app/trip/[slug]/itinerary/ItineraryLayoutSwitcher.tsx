"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useIsDesktop } from "@/hooks/useIsDesktop";
import { moveItineraryItemToDay } from "@/lib/actions/trip";
import { DayRouteMap, type MapDay } from "@/components/map/DayRouteMap";
import { ItineraryDaysView } from "./ItineraryDaysView";
import type { DayListItem } from "./DayItemsList";
import { ItineraryMobileView } from "./ItineraryMobileView";
import { ItineraryTopBar } from "./ItineraryTopBar";
import { ItineraryWizard } from "./ItineraryWizard";
import { ExportPdfButton } from "./ExportPdfButton";
import { AddDayButton } from "./AddDayButton";
import { SaveItineraryButton } from "./SaveItineraryButton";

type Day = { id: string; dayIndex: number; date: string | null; items: DayListItem[] };
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
  todayDayIndex,
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
  /** Which dayIndex is actually today's real calendar date (see
   * resolveTodayDayIndex) — null when there's no trip-start date set or
   * today falls outside the trip's span. */
  todayDayIndex: number | null;
}) {
  const router = useRouter();
  const isDesktop = useIsDesktop();

  // Desktop's side panel (ItineraryDaysView, focused mode) and its route map
  // (DayRouteMap) used to track completely independent day selections — the
  // panel had its own internal focused-day state, the map had its own
  // internal "which day(s) to show" state, and neither told the other about
  // a change. Stepping to "יום 2" in the panel left the map still showing
  // every day (or whichever day it last had selected), unlike the mobile
  // layout, which already keeps its own drawer and map in sync (see
  // ItineraryMobileView). `mapOverride` is undefined while the map should
  // just mirror focusedDayIndex; it's set the moment the map's own day-pill
  // row is used directly (including "כל הימים", i.e. null) so that stays a
  // real, independent override — exactly what the panel's own day-switcher
  // arrows reset the next time they're used.
  const [focusedDayIndex, setFocusedDayIndex] = useState<number>(dayListDays[0]?.dayIndex ?? 1);
  const [mapOverride, setMapOverride] = useState<number | null | undefined>(undefined);

  function handleFocusedDayIndexChange(dayIndex: number) {
    setFocusedDayIndex(dayIndex);
    setMapOverride(undefined);
  }

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
        todayDayIndex={todayDayIndex}
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
        {/* "+ הוספת יום" deliberately lives down with the grid/focused toggle
         * instead (see ItineraryDaysView's extraAction) — with 5 pills this
         * row wrapped onto 2 lines at 420px; 4 fits on one. */}
        <div className="flex flex-nowrap shrink-0 items-center gap-1.5 border-b p-2.5" style={{ borderColor: "color-mix(in srgb, var(--text) 10%, transparent)" }}>
          <ItineraryTopBar destinationId={destinationId} slug={slug} hasExistingDays={hasExistingDays} templates={templates} hideAddDay />
          <ItineraryWizard
            destinationId={destinationId}
            slug={slug}
            categories={categoryNames}
            areas={areas}
            hasExistingDays={hasExistingDays}
            triggerLabel="✨ מסלול AI"
          />
          <ExportPdfButton destinationId={destinationId} slug={slug} />
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-3">
          <ItineraryDaysView
            slug={slug}
            poiOptions={poiOptions}
            days={dayListDays}
            extraAction={
              <div className="flex items-center gap-1.5">
                <AddDayButton destinationId={destinationId} slug={slug} />
                <SaveItineraryButton destinationId={destinationId} slug={slug} hasExistingDays={hasExistingDays} />
              </div>
            }
            todayDayIndex={todayDayIndex}
            focusedDayIndex={focusedDayIndex}
            onFocusedDayIndexChange={handleFocusedDayIndexChange}
          />
        </div>
      </div>

      {mapDays.some((d) => d.points.length > 0) && (
        <div className="min-h-0 flex-1">
          {/* DayRouteMap's day-pill filter floats over the map itself (see
           * DayRouteMap) rather than sitting above it as a block-level
           * banner. It mirrors the side panel's own focused day by default
           * (stepping "יום 2" there now shows only day 2 here too — this
           * used to be two entirely independent day selections) — but using
           * the map's own pill row directly, "כל הימים" included, still
           * overrides that independently, same as picking a stop from the
           * map already did before this synced them; see mapOverride above. */}
          <DayRouteMap
            days={mapDays}
            fillHeight
            onMoveToDay={handleMoveToDay}
            todayDayIndex={todayDayIndex}
            activeDayIndex={mapOverride !== undefined ? mapOverride : focusedDayIndex}
            onActiveDayIndexChange={setMapOverride}
          />
        </div>
      )}
    </div>
  );
}
