"use client";

import { useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { generateItineraryFromPreferences } from "@/lib/actions/trip";
import { useSaveOrDiscardFlow } from "@/hooks/useSaveOrDiscardFlow";

export function ItineraryWizard({
  destinationId,
  slug,
  categories,
  areas,
  hasExistingDays,
}: {
  destinationId: string;
  slug: string;
  categories: string[];
  areas: { id: string; name: string }[];
  hasExistingDays: boolean;
}) {
  const router = useRouter();
  const { requestConfirm, modal: confirmModal } = useSaveOrDiscardFlow(destinationId, slug);
  const [open, setOpen] = useState(!hasExistingDays);
  const [mode, setMode] = useState<"filters" | "freeText">("filters");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedAreas, setSelectedAreas] = useState<string[]>([]);
  const [freeText, setFreeText] = useState("");
  const [tripDays, setTripDays] = useState(3);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const [loading, setLoading] = useState(false);

  function toggle(list: string[], setList: (v: string[]) => void, value: string) {
    setList(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);
  }

  async function actuallyGenerate() {
    setLoading(true);
    setError(null);
    const fd = new FormData();
    fd.set("tripDays", String(tripDays));
    if (mode === "freeText") {
      fd.set("freeText", freeText.trim());
    } else {
      selectedCategories.forEach((c) => fd.append("categories", c));
      selectedAreas.forEach((a) => fd.append("areas", a));
    }

    const result = await generateItineraryFromPreferences(destinationId, slug, fd);
    setLoading(false);
    if (result?.error) {
      setError(result.error);
      return;
    }
    setOpen(false);
    startTransition(() => router.refresh());
  }

  function handleGenerate() {
    requestConfirm(hasExistingDays, actuallyGenerate);
  }

  const trigger = (
    <button
      onClick={() => setOpen(true)}
      className="game-pop-in shrink-0 self-start rounded-full px-3 py-1.5 text-xs font-semibold text-white shadow-sm"
      style={{ background: "linear-gradient(135deg, #7C3AED, #EC4899)" }}
    >
      ✨ צרו מסלול AI
    </button>
  );

  if (!open) {
    return (
      <>
        {trigger}
        {confirmModal}
      </>
    );
  }

  // Rendered as a full-screen modal (portaled to document.body) rather than
  // inline — this trigger is meant to be droppable anywhere (a compact pill
  // in a horizontal action strip, in-flow on desktop, ...) without the big
  // question form underneath it disrupting whatever layout it's sitting in.
  if (typeof document === "undefined") return trigger;

  return createPortal(
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4" onClick={() => setOpen(false)}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[85vh] w-full max-w-md flex-col gap-4 overflow-y-auto border p-5"
        style={{ borderRadius: "var(--radius)", borderColor: "var(--primary)", background: "var(--surface)" }}
      >
      <h2 className="font-bold">כמה שאלות ונבנה לכם מסלול</h2>

      <div className="flex gap-1 self-start rounded-full bg-black/5 p-1">
        <button
          onClick={() => setMode("filters")}
          className="rounded-full px-3 py-1 text-xs font-semibold"
          style={{ background: mode === "filters" ? "var(--primary)" : "transparent", color: mode === "filters" ? "white" : "var(--text)" }}
        >
          🏷️ סינונים
        </button>
        <button
          onClick={() => setMode("freeText")}
          className="rounded-full px-3 py-1 text-xs font-semibold"
          style={{ background: mode === "freeText" ? "var(--primary)" : "transparent", color: mode === "freeText" ? "white" : "var(--text)" }}
        >
          ✍️ תיאור חופשי
        </button>
      </div>

      {mode === "freeText" ? (
        <div>
          <p className="mb-2 text-sm font-semibold">ספרו לנו מה אתם אוהבים</p>
          <textarea
            value={freeText}
            onChange={(e) => setFreeText(e.target.value)}
            placeholder="למשל: אני אוהב אוכל טוב ומוזיאונים, פחות מעניין אותי קניות..."
            rows={3}
            className="w-full rounded-lg border p-3 text-sm"
            style={{ borderColor: "var(--primary)" }}
          />
        </div>
      ) : (
        <>
          <div>
            <p className="mb-2 text-sm font-semibold">מה אתם אוהבים?</p>
            <div className="flex flex-wrap gap-2">
              {categories.map((c) => (
                <button
                  key={c}
                  onClick={() => toggle(selectedCategories, setSelectedCategories, c)}
                  className="rounded-full border px-3 py-1 text-sm"
                  style={{
                    borderColor: "var(--primary)",
                    background: selectedCategories.includes(c) ? "var(--primary)" : "transparent",
                    color: selectedCategories.includes(c) ? "white" : "var(--text)",
                  }}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          {areas.length > 1 && (
            <div>
              <p className="mb-2 text-sm font-semibold">אזורים (אופציונלי - ריק = הכל)</p>
              <div className="flex flex-wrap gap-2">
                {areas.map((a) => (
                  <button
                    key={a.id}
                    onClick={() => toggle(selectedAreas, setSelectedAreas, a.id)}
                    className="rounded-full border px-3 py-1 text-sm"
                    style={{
                      borderColor: "var(--primary)",
                      background: selectedAreas.includes(a.id) ? "var(--primary)" : "transparent",
                      color: selectedAreas.includes(a.id) ? "white" : "var(--text)",
                    }}
                  >
                    {a.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      <label className="flex items-center gap-2 text-sm font-semibold">
        כמה ימים?
        <input
          type="number"
          min={1}
          max={14}
          value={tripDays}
          onChange={(e) => setTripDays(Number(e.target.value))}
          className="w-20 rounded-lg border px-2 py-1"
          style={{ borderColor: "var(--primary)" }}
        />
      </label>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex gap-2">
        <button
          onClick={handleGenerate}
          disabled={loading || (mode === "freeText" && freeText.trim().length === 0)}
          className="rounded-full px-5 py-2.5 font-semibold text-white disabled:opacity-50"
          style={{ background: "linear-gradient(135deg, #7C3AED, #EC4899)" }}
        >
          {loading ? "בונה מסלול..." : "✨ צרו מסלול AI"}
        </button>
        {hasExistingDays && (
          <button onClick={() => setOpen(false)} className="rounded-full px-5 py-2.5 text-sm font-semibold opacity-70">
            ביטול
          </button>
        )}
      </div>
      {confirmModal}
      </div>
    </div>,
    document.body
  );
}
