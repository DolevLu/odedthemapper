"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { generateItineraryFromPreferences } from "@/lib/actions/trip";

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
  const [open, setOpen] = useState(!hasExistingDays);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedAreas, setSelectedAreas] = useState<string[]>([]);
  const [tripDays, setTripDays] = useState(3);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const [loading, setLoading] = useState(false);

  function toggle(list: string[], setList: (v: string[]) => void, value: string) {
    setList(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);
  }

  async function handleGenerate() {
    setLoading(true);
    setError(null);
    const fd = new FormData();
    fd.set("tripDays", String(tripDays));
    selectedCategories.forEach((c) => fd.append("categories", c));
    selectedAreas.forEach((a) => fd.append("areas", a));

    const result = await generateItineraryFromPreferences(destinationId, slug, fd);
    setLoading(false);
    if (result?.error) {
      setError(result.error);
      return;
    }
    setOpen(false);
    startTransition(() => router.refresh());
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="self-start rounded-full px-4 py-2 text-sm font-semibold text-white"
        style={{ background: "linear-gradient(135deg, #7C3AED, #EC4899)" }}
      >
        🤖 בנו לי מסלול אוטומטית
      </button>
    );
  }

  return (
    <div
      className="flex flex-col gap-4 border p-5"
      style={{ borderRadius: "var(--radius)", borderColor: "var(--primary)", background: "var(--surface)" }}
    >
      <h2 className="font-bold">כמה שאלות ונבנה לכם מסלול</h2>

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
          <p className="mb-2 text-sm font-semibold">אזורים (אופציונלי — ריק = הכל)</p>
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
          disabled={loading}
          className="rounded-full px-5 py-2.5 font-semibold text-white disabled:opacity-50"
          style={{ background: "linear-gradient(135deg, #7C3AED, #EC4899)" }}
        >
          {loading ? "בונה מסלול..." : "✨ בנו לי מסלול"}
        </button>
        {hasExistingDays && (
          <button onClick={() => setOpen(false)} className="rounded-full px-5 py-2.5 text-sm font-semibold opacity-70">
            ביטול
          </button>
        )}
      </div>
      {hasExistingDays && <p className="text-xs opacity-50">שימו לב: זה יחליף את הימים הקיימים במסלול.</p>}
    </div>
  );
}
