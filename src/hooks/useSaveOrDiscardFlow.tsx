"use client";

import { useState } from "react";
import { saveItineraryAsTemplate, clearActiveItineraryDays } from "@/lib/actions/trip";

/**
 * Shared confirmation flow for anything that's about to replace the active
 * itinerary's days (the Tinder builder, the AI wizard) — used from both so
 * clicking either one behaves the same way. When there's nothing to lose
 * (no existing days) `requestConfirm` just runs the action immediately; when
 * there is, it shows a modal offering to save the current plan under a name
 * first (as an ItineraryTemplate — see the version dropdown) or discard it,
 * before calling through to whatever the caller actually wanted to do.
 */
export function useSaveOrDiscardFlow(destinationId: string, slug: string) {
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);
  const [nameStep, setNameStep] = useState(false);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  function requestConfirm(hasExistingDays: boolean, onProceed: () => void) {
    if (!hasExistingDays) {
      onProceed();
      return;
    }
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
            <p className="mb-4 text-center font-bold">כבר יש לכם מסלול פעיל — מה לעשות איתו?</p>
            <div className="flex flex-col gap-2">
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
