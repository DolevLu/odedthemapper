"use client";

import { useMemo, useState, useTransition } from "react";
import { addClientItineraryItem } from "@/lib/actions/trip";

export type PoiOption = { id: string; name: string; areaName: string; categoryName: string };

export function AddClientItem({ dayId, slug, pois }: { dayId: string; slug: string; pois: PoiOption[] }) {
  const [mode, setMode] = useState<"pick" | "custom">("pick");
  const [category, setCategory] = useState("");
  const [poiId, setPoiId] = useState("");
  const [customLabel, setCustomLabel] = useState("");
  const [timeOfDay, setTimeOfDay] = useState("");
  const [, startTransition] = useTransition();

  const categories = useMemo(() => Array.from(new Set(pois.map((p) => p.categoryName))).sort(), [pois]);
  const poisInCategory = useMemo(() => pois.filter((p) => p.categoryName === category), [pois, category]);

  function submit() {
    const fd = new FormData();
    if (mode === "pick") {
      if (!poiId) return;
      fd.set("poiId", poiId);
    } else {
      if (!customLabel.trim()) return;
      fd.set("customLabel", customLabel.trim());
    }
    if (timeOfDay) fd.set("timeOfDay", timeOfDay);
    startTransition(() => {
      addClientItineraryItem(dayId, slug, fd);
    });
    setCategory("");
    setPoiId("");
    setCustomLabel("");
    setTimeOfDay("");
  }

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-dashed p-3" style={{ borderColor: "color-mix(in srgb, var(--primary) 30%, transparent)" }}>
      <div className="flex gap-1 text-xs">
        <button onClick={() => setMode("pick")} className="rounded-full px-3 py-1 font-medium" style={{ background: mode === "pick" ? "var(--primary)" : "transparent", color: mode === "pick" ? "white" : "var(--text)" }}>
          בחירה מהרשימה
        </button>
        <button onClick={() => setMode("custom")} className="rounded-full px-3 py-1 font-medium" style={{ background: mode === "custom" ? "var(--primary)" : "transparent", color: mode === "custom" ? "white" : "var(--text)" }}>
          הוספה חופשית
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {mode === "pick" ? (
          <>
            <select value={category} onChange={(e) => { setCategory(e.target.value); setPoiId(""); }} className="flex-1 rounded-lg border px-2 py-1.5 text-sm" style={{ borderColor: "var(--primary)" }}>
              <option value="">קטגוריה...</option>
              {categories.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <select value={poiId} onChange={(e) => setPoiId(e.target.value)} disabled={!category} className="flex-1 rounded-lg border px-2 py-1.5 text-sm disabled:opacity-50" style={{ borderColor: "var(--primary)" }}>
              <option value="">נקודה...</option>
              {poisInCategory.map((p) => <option key={p.id} value={p.id}>{p.name} · {p.areaName}</option>)}
            </select>
          </>
        ) : (
          <input value={customLabel} onChange={(e) => setCustomLabel(e.target.value)} placeholder="שם עצירה חופשית" className="flex-1 rounded-lg border px-3 py-1.5 text-sm" style={{ borderColor: "var(--primary)" }} />
        )}
        <input type="time" value={timeOfDay} onChange={(e) => setTimeOfDay(e.target.value)} className="w-28 rounded-lg border px-2 py-1.5 text-sm" style={{ borderColor: "var(--primary)" }} />
        <button onClick={submit} className="rounded-lg px-3 py-1.5 text-sm font-semibold text-white" style={{ background: "var(--primary)" }}>
          הוספה
        </button>
      </div>
    </div>
  );
}
