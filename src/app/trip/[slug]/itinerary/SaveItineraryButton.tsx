"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveItineraryAsTemplate } from "@/lib/actions/trip";

/** A standalone "save the current active itinerary as a named snapshot"
 * button — distinct from useSaveOrDiscardFlow's own save prompt, which only
 * ever appears bundled with a destructive follow-up (about to replace or
 * clear the active itinerary). This one does neither: the active itinerary
 * keeps being edited exactly as before, a new saved copy just joins the
 * "📂 שמורים" dropdown's list, so trying out a different route for the same
 * trip doesn't mean losing today's version first. */
export function SaveItineraryButton({ destinationId, slug, hasExistingDays }: { destinationId: string; slug: string; hasExistingDays: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [, startTransition] = useTransition();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  function handleSave() {
    setSaving(true);
    startTransition(async () => {
      const result = await saveItineraryAsTemplate(destinationId, slug, name.trim() || "המסלול שלי", "personal");
      setSaving(false);
      if (result && "error" in result) {
        window.alert(result.error);
        return;
      }
      setOpen(false);
      setName("");
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      router.refresh();
    });
  }

  return (
    <div className="relative shrink-0">
      <button
        onClick={() => setOpen((v) => !v)}
        disabled={!hasExistingDays}
        title={hasExistingDays ? "שמירת המסלול הנוכחי בשם" : "אין עדיין מסלול לשמור"}
        className="flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-semibold shadow-sm disabled:opacity-40"
        style={{ borderColor: "var(--primary)", color: "var(--primary)", background: "var(--surface)" }}
      >
        {saved ? "✓ נשמר" : "💾 שמירה"}
      </button>
      {open && (
        <div
          className="absolute z-30 mt-1 w-64 rounded-xl border p-2.5 shadow-lg"
          style={{ background: "var(--surface)", borderColor: "color-mix(in srgb, var(--primary) 20%, transparent)" }}
        >
          <p className="mb-2 text-xs font-bold opacity-70">איך לקרוא למסלול השמור?</p>
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSave()}
            placeholder='למשל: "מסלול טיול משפחה"'
            className="mb-2 w-full rounded-lg border px-2 py-1.5 text-sm"
            style={{ borderColor: "var(--primary)" }}
          />
          <div className="flex gap-1.5">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 rounded-full px-3 py-1.5 text-xs font-bold text-white disabled:opacity-60"
              style={{ background: "var(--primary)" }}
            >
              {saving ? "שומר…" : "שמירה"}
            </button>
            <button onClick={() => setOpen(false)} className="rounded-full px-3 py-1.5 text-xs opacity-60">
              ביטול
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
