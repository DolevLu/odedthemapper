"use client";

import { useState } from "react";
import type { ThemeConfig } from "@/lib/theme/types";
import type { AlbumDaysConfig } from "@/lib/actions/album";
import { AlbumUploadForm } from "./AlbumUploadForm";
import { AlbumGrid } from "./AlbumGrid";
import { CollageBuilder } from "./CollageBuilder";
import { DigitalAlbumView } from "./DigitalAlbumView";
import { AlbumSettingsPanel } from "./AlbumSettingsPanel";
import { AlbumBookPanel } from "@/components/album/AlbumBookPanel";
import { useTranslation } from "@/components/i18n/LanguageContext";
import type { DictionaryKey } from "@/lib/i18n/dictionary";

export type AlbumMediaItem = { id: string; type: "photo" | "video"; url: string; createdAt: string; dayIndex: number | null };
export type CuratedPhoto = { id: string; url: string; caption: string };

const TABS = [
  { key: "upload", labelKey: "album.tab.upload" },
  { key: "collage", labelKey: "album.tab.collage" },
  { key: "book", labelKey: "album.tab.book" },
] satisfies { key: string; labelKey: DictionaryKey }[];

type TabKey = (typeof TABS)[number]["key"];

// Even without a saved itinerary, travelers can still divide photos into up
// to this many days manually.
const DEFAULT_DAY_OPTIONS = 10;

export function AlbumScreen({
  slug,
  destinationId,
  destinationName,
  theme,
  media,
  curatedPhotos,
  tripDayCount,
  initialSettings,
  samplePhotos,
  initialBookJson,
}: {
  slug: string;
  destinationId: string;
  destinationName: string;
  theme: ThemeConfig;
  media: AlbumMediaItem[];
  curatedPhotos: CuratedPhoto[];
  tripDayCount: number;
  initialSettings: { templateKey: string; backgroundColor: string | null; days: AlbumDaysConfig };
  samplePhotos: { url: string; caption: string }[];
  initialBookJson: string | null;
}) {
  const [tab, setTab] = useState<TabKey>("upload");
  const { t, lang } = useTranslation();
  const allPhotos = [
    ...media.filter((m) => m.type === "photo").map((m) => ({ id: m.id, url: m.url })),
    ...curatedPhotos.map((p) => ({ id: p.id, url: p.url })),
  ];
  const maxAssignedDay = media.reduce((m, item) => Math.max(m, item.dayIndex ?? 0), 0);
  const dayOptions = Array.from({ length: Math.max(tripDayCount, maxAssignedDay, DEFAULT_DAY_OPTIONS) }, (_, i) => i + 1);
  const usedDayNumbers = Array.from(new Set(media.map((m) => m.dayIndex).filter((d): d is number => d != null))).sort((a, b) => a - b);
  const titleableDayNumbers = usedDayNumbers.length > 0 ? usedDayNumbers : Array.from({ length: tripDayCount }, (_, i) => i + 1);

  return (
    <div>
      <h1 className="mb-1 text-xl font-bold" style={{ fontFamily: "var(--font-heading)" }}>
        {t("album.titlePrefix")} {destinationName}
      </h1>
      <p className="mb-4 text-sm opacity-60">{t("album.subtitle")}</p>

      <div className="mb-5 flex flex-wrap gap-2">
        {TABS.map((tabItem) => (
          <button
            key={tabItem.key}
            onClick={() => setTab(tabItem.key)}
            className="rounded-full border px-4 py-1.5 text-sm font-semibold"
            style={{
              borderColor: "var(--primary)",
              background: tab === tabItem.key ? "var(--primary)" : "transparent",
              color: tab === tabItem.key ? "white" : "var(--text)",
            }}
          >
            {t(tabItem.labelKey)}
          </button>
        ))}
      </div>

      {tab === "upload" && (
        <div className="flex flex-col gap-5">
          <AlbumUploadForm destinationId={destinationId} slug={slug} />
          <AlbumGrid media={media} slug={slug} dayOptions={dayOptions} />
        </div>
      )}

      {tab === "collage" && <CollageBuilder photos={allPhotos} destinationName={destinationName} slug={slug} />}

      {tab === "book" && (
        <div className="flex flex-col gap-5">
          <AlbumBookPanel
            destinationId={destinationId}
            destinationName={destinationName}
            slug={slug}
            media={media}
            samplePhotos={samplePhotos}
            initialBookJson={initialBookJson}
            dayConfig={initialSettings.days}
            onGoUpload={() => setTab("upload")}
          />
          <details className="rounded-xl border p-3" style={{ borderColor: "rgba(0,0,0,.12)" }}>
            <summary className="cursor-pointer text-sm font-semibold">{t("book.classic")}</summary>
            <div className="mt-3 flex flex-col gap-5">
              <AlbumSettingsPanel destinationId={destinationId} slug={slug} initialSettings={initialSettings} dayNumbers={titleableDayNumbers} />
              <DigitalAlbumView destinationName={destinationName} theme={theme} media={media} curatedPhotos={curatedPhotos} settings={initialSettings} lang={lang} />
            </div>
          </details>
        </div>
      )}
    </div>
  );
}
