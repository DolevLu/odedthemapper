"use client";

import { useMemo, useState, useTransition } from "react";
import { addItineraryItem, addCustomItineraryItem } from "@/lib/actions/trip";

export type PoiOption = { id: string; name: string; areaName: string; categoryName: string };

export function AddItemToDay({
  dayId,
  slug,
  pois,
}: {
  dayId: string;
  slug: string;
  pois: PoiOption[];
}) {
  const [mode, setMode] = useState<"pick" | "custom">("pick");
  const [category, setCategory] = useState("");
  const [poiId, setPoiId] = useState("");
  const [customLabel, setCustomLabel] = useState("");
  const [, startTransition] = useTransition();

  const categories = useMemo(
    () => Array.from(new Set(pois.map((p) => p.categoryName))).sort(),
    [pois]
  );
  const poisInCategory = useMemo(
    () => pois.filter((p) => p.categoryName === category),
    [pois, category]
  );

  function handleAddPoi() {
    if (!poiId) return;
    startTransition(() => {
      addItineraryItem(dayId, poiId, slug);
    });
    setCategory("");
    setPoiId("");
  }

  function handleAddCustom() {
    if (!customLabel.trim()) return;
    const fd = new FormData();
    fd.set("customLabel", customLabel.trim());
    startTransition(() => {
      addCustomItineraryItem(dayId, slug, fd);
    });
    setCustomLabel("");
  }

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-dashed p-3" style={{ borderColor: "color-mix(in srgb, var(--primary) 30%, transparent)" }}>
      <div className="flex gap-1 text-xs">
        <button
          onClick={() => setMode("pick")}
          className="rounded-full px-3 py-1 font-medium"
          style={{ background: mode === "pick" ? "var(--primary)" : "transparent", color: mode === "pick" ? "white" : "var(--text)" }}
        >
          בחירה מהרשימה
        </button>
        <button
          onClick={() => setMode("custom")}
          className="rounded-full px-3 py-1 font-medium"
          style={{ background: mode === "custom" ? "var(--primary)" : "transparent", color: mode === "custom" ? "white" : "var(--text)" }}
        >
          הוספה חופשית
        </button>
      </div>

      {mode === "pick" ? (
        <div className="flex flex-col gap-2 sm:flex-row">
          <select
            value={category}
            onChange={(e) => {
              setCategory(e.target.value);
              setPoiId("");
            }}
            className="flex-1 rounded-lg border px-2 py-1.5 text-sm"
            style={{ borderColor: "var(--primary)" }}
          >
            <option value="">בחרו קטגוריה...</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <select
            value={poiId}
            onChange={(e) => setPoiId(e.target.value)}
            disabled={!category}
            className="flex-1 rounded-lg border px-2 py-1.5 text-sm disabled:opacity-50"
            style={{ borderColor: "var(--primary)" }}
          >
            <option value="">בחרו נקודה...</option>
            {poisInCategory.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} · {p.areaName}
              </option>
            ))}
          </select>
          <button
            onClick={handleAddPoi}
            disabled={!poiId}
            className="rounded-lg px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-40"
            style={{ background: "var(--primary)", borderRadius: "var(--radius)" }}
          >
            הוספה
          </button>
        </div>
      ) : (
        <div className="flex gap-2">
          <input
            value={customLabel}
            onChange={(e) => setCustomLabel(e.target.value)}
            placeholder='למשל: "נסיעה לעיירה סמוכה" או תחנה שלא ברשימה'
            className="flex-1 rounded-lg border px-3 py-1.5 text-sm"
            style={{ borderColor: "var(--primary)" }}
          />
          <button
            onClick={handleAddCustom}
            disabled={!customLabel.trim()}
            className="rounded-lg px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-40"
            style={{ background: "var(--primary)", borderRadius: "var(--radius)" }}
          >
            הוספה
          </button>
        </div>
      )}
    </div>
  );
}
