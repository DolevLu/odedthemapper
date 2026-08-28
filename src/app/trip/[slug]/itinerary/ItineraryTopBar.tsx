"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { applyItineraryTemplate, deleteItineraryTemplate, createItineraryDay } from "@/lib/actions/trip";
import { useSaveOrDiscardFlow } from "@/hooks/useSaveOrDiscardFlow";

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
}: {
  destinationId: string;
  slug: string;
  hasExistingDays: boolean;
  templates: Template[];
}) {
  const router = useRouter();
  const { requestConfirm, modal } = useSaveOrDiscardFlow(destinationId, slug);
  const [menuOpen, setMenuOpen] = useState(false);
  const [, startTransition] = useTransition();
  const [applying, setApplying] = useState<string | null>(null);

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
    if (!window.confirm("למחוק את המסלול השמור הזה?")) return;
    startTransition(() => {
      deleteItineraryTemplate(templateId, slug, "personal");
      router.refresh();
    });
  }

  function handleAddDay() {
    startTransition(() => {
      createItineraryDay(destinationId, slug);
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
          📂 שמורים{templates.length > 0 ? ` (${templates.length})` : ""} ▾
        </button>
        {menuOpen && (
          <div
            className="absolute z-30 mt-1 w-64 rounded-xl border p-1.5 shadow-lg"
            style={{ background: "var(--surface)", borderColor: "color-mix(in srgb, var(--primary) 20%, transparent)" }}
            onMouseLeave={() => setMenuOpen(false)}
          >
            <div className="px-2 py-1.5 text-xs font-bold opacity-60">🟢 המסלול הפעיל (נוכחי)</div>
            {templates.length === 0 && <p className="px-2 py-2 text-xs opacity-50">אין עדיין מסלולים שמורים.</p>}
            {templates.map((t) => (
              <button
                key={t.id}
                onClick={() => handleView(t.id)}
                disabled={applying === t.id}
                className="flex w-full items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-start text-sm hover:bg-black/5 disabled:opacity-50"
              >
                <span className="truncate">{applying === t.id ? "טוען…" : t.name}</span>
                <span className="flex shrink-0 items-center gap-1.5">
                  <span onClick={(e) => handleApply(t.id, e)} className="opacity-50 hover:opacity-100" role="button" aria-label="החלה על המסלול הפעיל" title="החלה על המסלול הפעיל">
                    ✅
                  </span>
                  <span onClick={(e) => handleDelete(t.id, e)} className="opacity-40 hover:opacity-100" role="button" aria-label="מחיקה">
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
        🔥 מסלול טינדר
      </button>

      <button
        onClick={handleAddDay}
        className="shrink-0 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold text-white"
        style={{ background: "var(--primary)" }}
      >
        + הוספת יום
      </button>

      {modal}
    </div>
  );
}
