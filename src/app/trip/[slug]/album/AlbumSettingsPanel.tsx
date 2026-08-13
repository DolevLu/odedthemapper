"use client";

import { useState, useTransition } from "react";
import { saveAlbumSettings, ensureAlbumShareToken, type AlbumDaysConfig } from "@/lib/actions/album";

const TEMPLATES = [
  { key: "polaroid", label: "🖼️ פולארויד", hint: "תמונות מוטות עם מסגרת לבנה, כמו אלבום מודבק" },
  { key: "timeline", label: "🧵 ציר זמן", hint: "יום אחרי יום, בשורה כרונולוגית ברורה" },
  { key: "postcard", label: "💌 גלויות", hint: "כל תמונה כגלויה עם פינה מקופלת" },
] as const;

const BG_SWATCHES = ["#FBF6EE", "#FCEEE3", "#EAF3EA", "#EFEAF6", "#FDECEF", "#EAF2F8"];

export type AlbumSettingsValue = { templateKey: string; backgroundColor: string | null; days: AlbumDaysConfig };

export function AlbumSettingsPanel({
  destinationId,
  slug,
  initialSettings,
  dayNumbers,
}: {
  destinationId: string;
  slug: string;
  initialSettings: AlbumSettingsValue;
  dayNumbers: number[];
}) {
  const [templateKey, setTemplateKey] = useState(initialSettings.templateKey);
  const [backgroundColor, setBackgroundColor] = useState(initialSettings.backgroundColor);
  const [days, setDays] = useState<AlbumDaysConfig>(initialSettings.days);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [, startTransition] = useTransition();

  function persist(next: Partial<AlbumSettingsValue>) {
    const merged = { templateKey, backgroundColor, days, ...next };
    setSaved(false);
    startTransition(() => {
      saveAlbumSettings(destinationId, slug, merged).then(() => {
        setSaved(true);
        setTimeout(() => setSaved(false), 1500);
      });
    });
  }

  function updateDayField(day: number, field: "title" | "subtitle", value: string) {
    const next = { ...days, [day]: { ...days[day], [field]: value } };
    setDays(next);
    persist({ days: next });
  }

  async function exportPdf() {
    setPdfLoading(true);
    const token = await ensureAlbumShareToken(destinationId, slug);
    setPdfLoading(false);
    window.open(`/share/album/${token}`, "_blank");
  }

  return (
    <div className="flex flex-col gap-5 border p-4" style={{ borderRadius: "var(--radius)", borderColor: "var(--primary)", background: "var(--surface)" }}>
      <div>
        <p className="mb-2 text-xs font-semibold opacity-70">סוג אלבום / תבנית</p>
        <div className="flex flex-wrap gap-2">
          {TEMPLATES.map((t) => (
            <button
              key={t.key}
              type="button"
              title={t.hint}
              onClick={() => {
                setTemplateKey(t.key);
                persist({ templateKey: t.key });
              }}
              className="rounded-full border px-3 py-1.5 text-sm font-semibold"
              style={{
                borderColor: "var(--primary)",
                background: templateKey === t.key ? "var(--primary)" : "transparent",
                color: templateKey === t.key ? "white" : "var(--text)",
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="mb-2 text-xs font-semibold opacity-70">צבע רקע האלבום</p>
        <div className="flex flex-wrap items-center gap-2">
          {BG_SWATCHES.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => {
                setBackgroundColor(c);
                persist({ backgroundColor: c });
              }}
              className="h-8 w-8 rounded-full border-2"
              style={{ background: c, borderColor: backgroundColor === c ? "var(--primary)" : "transparent" }}
              aria-label={c}
            />
          ))}
          <input
            type="color"
            value={backgroundColor ?? "#FBF6EE"}
            onChange={(e) => {
              setBackgroundColor(e.target.value);
              persist({ backgroundColor: e.target.value });
            }}
            className="h-8 w-8 cursor-pointer rounded-full border-0 bg-transparent p-0"
            title="צבע מותאם אישית"
          />
        </div>
      </div>

      {dayNumbers.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-semibold opacity-70">כותרות לימים / אזורים</p>
          <div className="flex flex-col gap-2">
            {dayNumbers.map((day) => (
              <div key={day} className="flex flex-wrap items-center gap-2">
                <span className="w-14 shrink-0 text-xs font-semibold opacity-60">יום {day}</span>
                <input
                  value={days[day]?.title ?? ""}
                  onChange={(e) => updateDayField(day, "title", e.target.value)}
                  placeholder={`כותרת ליום ${day}, למשל "רומא העתיקה"`}
                  className="min-w-[10rem] flex-1 rounded-lg border px-2.5 py-1.5 text-sm"
                  style={{ borderColor: "var(--primary)" }}
                />
                <input
                  value={days[day]?.subtitle ?? ""}
                  onChange={(e) => updateDayField(day, "subtitle", e.target.value)}
                  placeholder="תת-כותרת / אזור, למשל &quot;הרובע העתיק&quot;"
                  className="min-w-[10rem] flex-1 rounded-lg border px-2.5 py-1.5 text-sm"
                  style={{ borderColor: "var(--primary)" }}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center gap-3">
        <button
          onClick={exportPdf}
          disabled={pdfLoading}
          className="rounded-full border px-4 py-2 text-sm font-semibold disabled:opacity-50"
          style={{ borderColor: "var(--primary)", color: "var(--primary)" }}
        >
          {pdfLoading ? "מכין..." : "🖨️ ייצוא כ-PDF"}
        </button>
        {saved && <span className="text-xs opacity-50">✓ נשמר</span>}
      </div>
    </div>
  );
}
