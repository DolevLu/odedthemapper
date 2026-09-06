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
    <div className="flex h-full flex-col">
      {/* A slim pill toolbar spanning the full width, above the side
       * panel+map split — same rounded-pill visual language as the map
       * screen's own category filters, instead of a page-header block. */}
      <div
        className="flex flex-wrap shrink-0 items-center gap-1.5 border-b p-3"
        style={{ borderColor: "color-mix(in srgb, var(--primary) 15%, transparent)", background: "var(--surface)" }}
      >
        <ItineraryTopBar destinationId={destinationId} slug={slug} hasExistingDays={hasExistingDays} templates={templates} />
        <ItineraryWizard destinationId={destinationId} slug={slug} categories={categoryNames} areas={areas} hasExistingDays={hasExistingDays} />
        <ExportPdfButton destinationId={destinationId} slug={slug} />
      </div>

      <div className="flex min-h-0 flex-1 items-stretch">
        <div
          className="flex h-full min-h-0 w-[380px] shrink-0 flex-col border-e p-4"
          style={{ borderColor: "color-mix(in srgb, var(--primary) 15%, transparent)", background: "var(--surface)" }}
        >
          <ItineraryDaysView slug={slug} poiOptions={poiOptions} days={dayListDays} />
        </div>

        {mapDays.some((d) => d.points.length > 0) && (
          <div className="min-h-0 flex-1">
            <DayRouteMap days={mapDays} fillHeight onMoveToDay={handleMoveToDay} />
          </div>
        )}
      </div>
    </div>
  );
}
