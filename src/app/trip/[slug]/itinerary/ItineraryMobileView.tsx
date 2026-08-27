"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { colorForDay } from "@/lib/geo";
import { moveItineraryItemToDay } from "@/lib/actions/trip";
import { DayRouteMap, type MapDay } from "@/components/map/DayRouteMap";
import { ItineraryDaysView } from "./ItineraryDaysView";
import type { DayListItem } from "./DayItemsList";
import { ItineraryTopBar } from "./ItineraryTopBar";
import { ItineraryWizard } from "./ItineraryWizard";
import { ExportPdfButton } from "./ExportPdfButton";

type Day = { id: string; dayIndex: number; items: DayListItem[] };
type PoiOption = { id: string; name: string; areaName: string; categoryName: string };
type Template = { id: string; name: string };

const OPEN_VH = 76;
const PEEK_PX = 170;

/**
 * Mobile itinerary layout: the route map fills the screen (same fixed
 * full-viewport pattern as the Map tab) with the day's stop list living in a
 * draggable bottom sheet on top of it — defaults open almost all the way,
 * collapses to a peek (still showing the day switcher + the "now"/first
 * stop's card) via the handle, either dragged or tapped. Desktop keeps the
 * existing side-by-side list+map layout (see page.tsx) — only rendered when
 * useIsDesktop() is false, so exactly one Google Maps instance ever mounts.
 */
export function ItineraryMobileView({
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
  const pillRowRef = useRef<HTMLDivElement>(null);
  const [focusedDayIndex, setFocusedDayIndex] = useState(dayListDays[0]?.dayIndex ?? 1);
  // Independent of focusedDayIndex (which the drawer's list keeps using for
  // its own single-day view) — lets the map show every day's route at once,
  // matching the "כל הימים" pill desktop's DayRouteMap already has built in
  // but this mobile layout hides (showDaySwitcher={false}) in favor of its
  // own drawer-driven day nav.
  const [mapAllDays, setMapAllDays] = useState(false);
  const [drawerState, setDrawerState] = useState<"open" | "peek">("open");
  const [dragOffset, setDragOffset] = useState(0);
  const dragging = useRef(false);
  const dragStartY = useRef(0);
  const dragStartHeightPx = useRef(0);

  async function handleMoveToDay(itemId: string, dayIndex: number) {
    const result = await moveItineraryItemToDay(itemId, dayIndex, slug);
    if (result && "error" in result) {
      window.alert(result.error);
      return;
    }
    router.refresh();
  }

  function currentHeightPx() {
    const vh = typeof window !== "undefined" ? window.innerHeight : 800;
    return drawerState === "open" ? (OPEN_VH / 100) * vh : PEEK_PX;
  }

  function handlePointerDown(e: React.PointerEvent) {
    dragging.current = true;
    dragStartY.current = e.clientY;
    dragStartHeightPx.current = currentHeightPx();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }

  function handlePointerMove(e: React.PointerEvent) {
    if (!dragging.current) return;
    setDragOffset(dragStartY.current - e.clientY);
  }

  function handlePointerUp() {
    if (!dragging.current) return;
    dragging.current = false;
    const wasTap = Math.abs(dragOffset) < 6;
    if (wasTap) {
      setDrawerState((s) => (s === "open" ? "peek" : "open"));
      setDragOffset(0);
      return;
    }
    const vh = window.innerHeight;
    const openPx = (OPEN_VH / 100) * vh;
    const finalHeight = Math.min(openPx, Math.max(PEEK_PX, dragStartHeightPx.current + dragOffset));
    const mid = (openPx + PEEK_PX) / 2;
    setDrawerState(finalHeight > mid ? "open" : "peek");
    setDragOffset(0);
  }

  const liveHeightPx = dragging.current
    ? Math.min((OPEN_VH / 100) * (typeof window !== "undefined" ? window.innerHeight : 800), Math.max(PEEK_PX, dragStartHeightPx.current + dragOffset))
    : null;

  return (
    <div className="fixed inset-x-0 bottom-0 top-0 z-0">
      <DayRouteMap
        days={mapDays}
        mobileFullScreen
        showDaySwitcher={false}
        activeDayIndex={mapAllDays ? null : focusedDayIndex}
        onActiveDayIndexChange={(d) => d != null && setFocusedDayIndex(d)}
        onMoveToDay={handleMoveToDay}
      />

      {/* Floats over the map, at the very top — the map's own Map/Satellite
       * toggle has moved to the bottom-left on mobile (see DayRouteMap) so
       * this strip can have the top to itself. Same shrunk horizontal-scroll
       * pattern as the Map screen's own category-filter pills: a ref'd
       * scrollable row with flanking ‹/› arrow buttons and the native
       * scrollbar hidden (.no-scrollbar), so a row of otherwise-too-wide
       * action buttons stays reachable via a swipe instead of wrapping and
       * eating vertical space over the map. Each button keeps its own
       * existing color instead of being restyled into a uniform set. */}
      <div dir="ltr" className="absolute inset-x-0 top-3 z-10 flex items-center gap-1 px-2">
        <button
          onClick={() => pillRowRef.current?.scrollBy({ left: -160, behavior: "smooth" })}
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-sm shadow-md"
          style={{ background: "rgba(255,255,255,0.94)", color: "var(--text)" }}
          aria-label="גלילה שמאלה"
        >
          ‹
        </button>
        <div ref={pillRowRef} dir="rtl" className="no-scrollbar flex flex-1 gap-1.5 overflow-x-auto scroll-smooth p-1">
          <ItineraryTopBar destinationId={destinationId} slug={slug} hasExistingDays={hasExistingDays} templates={templates} />
          <ItineraryWizard destinationId={destinationId} slug={slug} categories={categoryNames} areas={areas} hasExistingDays={hasExistingDays} />
          <ExportPdfButton destinationId={destinationId} slug={slug} />
        </div>
        <button
          onClick={() => pillRowRef.current?.scrollBy({ left: 160, behavior: "smooth" })}
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-sm shadow-md"
          style={{ background: "rgba(255,255,255,0.94)", color: "var(--text)" }}
          aria-label="גלילה ימינה"
        >
          ›
        </button>
      </div>

      <div
        className="absolute inset-x-0 bottom-0 z-20 flex flex-col overflow-hidden rounded-t-3xl shadow-[0_-6px_24px_rgba(0,0,0,0.18)]"
        style={{
          background: "var(--surface)",
          height: liveHeightPx != null ? `${liveHeightPx}px` : drawerState === "open" ? `${OPEN_VH}vh` : `${PEEK_PX}px`,
          transition: dragging.current ? "none" : "height 0.22s ease",
        }}
      >
        <div
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          className="flex shrink-0 touch-none flex-col items-center gap-1 pb-1 pt-2"
        >
          <span className="h-1 w-10 rounded-full" style={{ background: "color-mix(in srgb, var(--primary) 30%, transparent)" }} />
          <span className="text-xs opacity-50">{drawerState === "open" ? "⌄ גררו למטה לצמצום" : "⌃ גררו למעלה להרחבה"}</span>
        </div>

        {dayListDays.length > 1 && drawerState === "open" && (
          <div className="flex shrink-0 items-center justify-between gap-2 border-b px-4 pb-2" style={{ borderColor: "color-mix(in srgb, var(--primary) 15%, transparent)" }}>
            <button
              onClick={() => {
                const idx = dayListDays.findIndex((d) => d.dayIndex === focusedDayIndex);
                if (idx > 0) {
                  setFocusedDayIndex(dayListDays[idx - 1].dayIndex);
                  setMapAllDays(false);
                }
              }}
              disabled={dayListDays.findIndex((d) => d.dayIndex === focusedDayIndex) === 0}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-lg disabled:opacity-30"
              style={{ borderColor: "var(--primary)" }}
            >
              ‹
            </button>
            <p className="min-w-0 truncate text-lg font-extrabold" style={{ fontFamily: "var(--font-heading)", color: colorForDay(focusedDayIndex - 1) }}>
              יום {focusedDayIndex}
            </p>
            <button
              onClick={() => setMapAllDays((v) => !v)}
              className="shrink-0 rounded-full border px-2.5 py-1 text-xs font-semibold"
              style={{
                borderColor: "var(--primary)",
                background: mapAllDays ? "var(--primary)" : "transparent",
                color: mapAllDays ? "white" : "var(--text)",
              }}
              title="הצגת כל הימים על גבי המפה"
            >
              🗺️ כל הימים
            </button>
            <button
              onClick={() => {
                const idx = dayListDays.findIndex((d) => d.dayIndex === focusedDayIndex);
                if (idx < dayListDays.length - 1) {
                  setFocusedDayIndex(dayListDays[idx + 1].dayIndex);
                  setMapAllDays(false);
                }
              }}
              disabled={dayListDays.findIndex((d) => d.dayIndex === focusedDayIndex) === dayListDays.length - 1}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-lg disabled:opacity-30"
              style={{ borderColor: "var(--primary)" }}
            >
              ›
            </button>
          </div>
        )}

        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          <ItineraryDaysView
            slug={slug}
            poiOptions={poiOptions}
            days={dayListDays}
            focusedDayIndex={focusedDayIndex}
            onFocusedDayIndexChange={setFocusedDayIndex}
            hideHeader
          />
        </div>
      </div>
    </div>
  );
}
