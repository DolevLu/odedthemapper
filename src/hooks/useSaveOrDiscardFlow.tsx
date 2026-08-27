"use client";

import { useState } from "react";
import { saveItineraryAsTemplate, clearActiveItineraryDays } from "@/lib/actions/trip";

/**
 * Shared confirmation flow for anything that's about to touch the active
 * itinerary's days (the Tinder builder, the AI wizard, switching to a saved
 * template) — used from all three so they behave consistently. When
 * there's nothing to lose (no existing days) `requestConfirm` just runs the
 * action immediately; when there is, it shows a modal.
 *
 * The Tinder builder additionally passes `allowContinue: true` — unlike the
 * AI wizard (which always fully regenerates) or switching to a different
 * saved template (which fully replaces by definition), swiping can sensibly
 * keep going on top of an existing itinerary instead of only ever
 * replacing/starting fresh, so it gets a third option that does nothing
 * destructive at all: proceed as-is.
 */
export function useSaveOrDiscardFlow(destinationId: string, slug: string) {
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);
  const [allowContinue, setAllowContinue] = useState(false);
  const [nameStep, setNameStep] = useState(false);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  function requestConfirm(hasExistingDays: boolean, onProceed: () => void, options?: { allowContinue?: boolean }) {
    if (!hasExistingDays) {
      onProceed();
      return;
    }
    setAllowContinue(Boolean(options?.allowContinue));
    setPendingAction(() => onProceed);
  }

  function finish() {
    const action = pendingAction;
    setPendingAction(null);
    setNameStep(false);
    setName("");
    setBusy(false);
    action?.();
  }

  function cancel() {
    setPendingAction(null);
    setNameStep(false);
    setName("");
  }

  function handleContinue() {
    finish();
  }

  async function handleSaveAndNew() {
    setBusy(true);
    await saveItineraryAsTemplate(destinationId, slug, name.trim() || "המסלול הקודם שלי", "personal");
    await clearActiveItineraryDays(destinationId, slug, "personal");
    finish();
  }

  async function handleDeleteAndNew() {
    setBusy(true);
    await clearActiveItineraryDays(destinationId, slug, "personal");
    finish();
  }

  const modal = pendingAction ? (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4" onClick={cancel}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-sm rounded-2xl p-5 shadow-xl" style={{ background: "var(--surface)" }}>
        {!nameStep ? (
          <>
            <p className="mb-4 text-center font-bold">כבר יש לכם מסלול פעיל - מה לעשות איתו?</p>
            <div className="flex flex-col gap-2">
              {allowContinue && (
                <button
                  onClick={handleContinue}
                  className="rounded-full px-4 py-2.5 text-sm font-bold text-white"
                  style={{ background: "linear-gradient(135deg, #F472B6, #F59E0B)" }}
                >
                  🔥 המשך והוסיפו למסלול הקיים
                </button>
              )}
              <button
                onClick={() => setNameStep(true)}
                className="rounded-full px-4 py-2.5 text-sm font-bold text-white"
                style={{ background: "var(--primary)" }}
              >
                💾 שמירת הקיים בשם ויצירת חדש
              </button>
              <button
                onClick={handleDeleteAndNew}
                disabled={busy}
                className="rounded-full border px-4 py-2.5 text-sm font-semibold disabled:opacity-60"
                style={{ borderColor: "#DC2626", color: "#DC2626" }}
              >
                {busy ? "מוחק…" : "🗑️ מחיקת הקיים ויצירת חדש"}
              </button>
              <button onClick={cancel} className="rounded-full px-4 py-2.5 text-sm opacity-60">
                ביטול
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="mb-3 text-center font-bold">איך לקרוא למסלול השמור?</p>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder='למשל: "מסלול טיול משפחה"'
              className="mb-3 w-full rounded-lg border px-3 py-2 text-sm"
              style={{ borderColor: "var(--primary)" }}
            />
            <div className="flex gap-2">
              <button
                onClick={handleSaveAndNew}
                disabled={busy}
                className="flex-1 rounded-full px-4 py-2.5 text-sm font-bold text-white disabled:opacity-60"
                style={{ background: "var(--primary)" }}
              >
                {busy ? "שומר…" : "שמירה והמשך"}
              </button>
              <button onClick={cancel} className="rounded-full px-4 py-2.5 text-sm opacity-60">
                ביטול
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  ) : null;

  return { requestConfirm, modal };
}
