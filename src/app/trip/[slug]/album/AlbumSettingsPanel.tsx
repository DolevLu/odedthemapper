"use client";

import { useState, useTransition } from "react";
import { saveAlbumSettings, ensureAlbumShareToken, type AlbumDaysConfig } from "@/lib/actions/album";
import { useTranslation } from "@/components/i18n/LanguageContext";
import type { DictionaryKey } from "@/lib/i18n/dictionary";

const TEMPLATES = [
  { key: "polaroid", labelKey: "album.template.polaroid.label", hintKey: "album.template.polaroid.hint" },
  { key: "timeline", labelKey: "album.template.timeline.label", hintKey: "album.template.timeline.hint" },
  { key: "postcard", labelKey: "album.template.postcard.label", hintKey: "album.template.postcard.hint" },
] satisfies { key: string; labelKey: DictionaryKey; hintKey: DictionaryKey }[];

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
  const { t } = useTranslation();

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
        <p className="mb-2 text-xs font-semibold opacity-70">{t("album.settings.templateLabel")}</p>
        <div className="flex flex-wrap gap-2">
          {TEMPLATES.map((template) => (
            <button
              key={template.key}
              type="button"
              title={t(template.hintKey)}
              onClick={() => {
                setTemplateKey(template.key);
                persist({ templateKey: template.key });
              }}
              className="rounded-full border px-3 py-1.5 text-sm font-semibold"
              style={{
                borderColor: "var(--primary)",
                background: templateKey === template.key ? "var(--primary)" : "transparent",
                color: templateKey === template.key ? "white" : "var(--text)",
              }}
            >
              {t(template.labelKey)}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="mb-2 text-xs font-semibold opacity-70">{t("album.settings.bgColorLabel")}</p>
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
            title={t("album.settings.customColor")}
          />
        </div>
      </div>

      {dayNumbers.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-semibold opacity-70">{t("album.settings.dayTitlesLabel")}</p>
          <div className="flex flex-col gap-2">
            {dayNumbers.map((day) => (
              <div key={day} className="flex flex-wrap items-center gap-2">
                <span className="w-14 shrink-0 text-xs font-semibold opacity-60">
                  {t("album.day")} {day}
                </span>
                <input
                  value={days[day]?.title ?? ""}
                  onChange={(e) => updateDayField(day, "title", e.target.value)}
                  placeholder={`${t("album.settings.dayTitlePlaceholderPrefix")} ${day}${t("album.settings.dayTitlePlaceholderExample")}`}
                  className="min-w-[10rem] flex-1 rounded-lg border px-2.5 py-1.5 text-sm"
                  style={{ borderColor: "var(--primary)" }}
                />
                <input
                  value={days[day]?.subtitle ?? ""}
                  onChange={(e) => updateDayField(day, "subtitle", e.target.value)}
                  placeholder={t("album.settings.subtitlePlaceholder")}
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
          {pdfLoading ? t("album.settings.preparing") : t("album.settings.exportPdf")}
        </button>
        {saved && <span className="text-xs opacity-50">{t("album.settings.saved")}</span>}
      </div>
    </div>
  );
}
