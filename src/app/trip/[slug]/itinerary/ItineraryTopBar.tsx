"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { applyItineraryTemplate, deleteItineraryTemplate } from "@/lib/actions/trip";
import { useSaveOrDiscardFlow } from "@/hooks/useSaveOrDiscardFlow";
import { AddDayButton } from "./AddDayButton";
import { useTranslation } from "@/components/i18n/LanguageContext";

type Template = { id: string; name: string };

/** Compact action row for the itinerary screen — the version-switcher
 * dropdown (pick/rename-free save of multiple saved itineraries per
 * destination, backed by ItineraryTemplate), the Tinder-builder entry
 * point, and "+ day", all sized down so they don't crowd out the itinerary
 * view itself, which is the actual point of this page. */
export function ItineraryTopBar({
  destinationId,
  slug,
  hasExistingDays,
  templates,
  hideAddDay = false,
}: {
  destinationId: string;
  slug: string;
  hasExistingDays: boolean;
  templates: Template[];
  /** Desktop's full-bleed layout puts "+ day" next to the day view's own
   * grid/focused toggle instead (see ItineraryDaysView's extraAction), to
   * fit everything else onto one action row without wrapping. */
  hideAddDay?: boolean;
}) {
  const router = useRouter();
  const { requestConfirm, modal } = useSaveOrDiscardFlow(destinationId, slug);
  const [menuOpen, setMenuOpen] = useState(false);
  const [, startTransition] = useTransition();
  const [applying, setApplying] = useState<string | null>(null);
  const { t } = useTranslation();

  function goToBuilder() {
    requestConfirm(hasExistingDays, () => router.push(`/trip/${slug}/itinerary/builder`), { allowContinue: true });
  }

  function handleApply(templateId: string, e: React.MouseEvent) {
    e.stopPropagation();
    if (applying) return;
    function proceed() {
      setMenuOpen(false);
      setApplying(templateId);
      startTransition(async () => {
        await applyItineraryTemplate(templateId, destinationId, slug, "personal");
        setApplying(null);
        router.refresh();
      });
    }
    requestConfirm(hasExistingDays, proceed);
  }

  // Clicking the saved route itself just shows it (read-only, no popup, no
  // overwrite-confirm) — applying it over the active itinerary is a
  // separate, explicit ✅ action next to it, per the user's own distinction
  // between "view this" and "build a route" (which does prompt).
  function handleView(templateId: string) {
    setMenuOpen(false);
    router.push(`/trip/${slug}/itinerary?previewTemplate=${templateId}`);
  }

  function handleDelete(templateId: string, e: React.MouseEvent) {
    e.stopPropagation();
    if (!window.confirm(t("topBar.confirmDeleteSaved"))) return;
    startTransition(() => {
      deleteItineraryTemplate(templateId, slug, "personal");
      router.refresh();
    });
  }

  return (
    <div className="flex flex-nowrap shrink-0 items-center gap-1.5">
      <div className="relative shrink-0">
        <button
          onClick={() => setMenuOpen((v) => !v)}
          className="flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-semibold shadow-sm"
          style={{ borderColor: "var(--primary)", color: "var(--primary)", background: "var(--surface)" }}
        >
          {t("topBar.savedRoutes")}{templates.length > 0 ? ` (${templates.length})` : ""} ▾
        </button>
        {menuOpen && (
          <div
            className="absolute z-30 mt-1 w-64 rounded-xl border p-1.5 shadow-lg"
            style={{ background: "var(--surface)", borderColor: "color-mix(in srgb, var(--primary) 20%, transparent)" }}
            onMouseLeave={() => setMenuOpen(false)}
          >
            <div className="px-2 py-1.5 text-xs font-bold opacity-60">{t("topBar.activeRoute")}</div>
            {templates.length === 0 && <p className="px-2 py-2 text-xs opacity-50">{t("topBar.noSavedRoutes")}</p>}
            {templates.map((template) => (
              <button
                key={template.id}
                onClick={() => handleView(template.id)}
                disabled={applying === template.id}
                className="flex w-full items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-start text-sm hover:bg-black/5 disabled:opacity-50"
              >
                <span className="truncate">{applying === template.id ? t("topBar.loading") : template.name}</span>
                <span className="flex shrink-0 items-center gap-1.5">
                  <span onClick={(e) => handleApply(template.id, e)} className="opacity-50 hover:opacity-100" role="button" aria-label={t("topBar.applyToActive")} title={t("topBar.applyToActive")}>
                    ✅
                  </span>
                  <span onClick={(e) => handleDelete(template.id, e)} className="opacity-40 hover:opacity-100" role="button" aria-label={t("topBar.delete")}>
                    🗑️
                  </span>
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      <button
        onClick={goToBuilder}
        className="game-pop-in shrink-0 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold text-white shadow-sm transition-transform hover:-translate-y-0.5"
        style={{ background: "linear-gradient(135deg, #F472B6, #F59E0B)" }}
      >
        {t("topBar.tinderRoute")}
      </button>

      {!hideAddDay && <AddDayButton destinationId={destinationId} slug={slug} />}

      {modal}
    </div>
  );
}
