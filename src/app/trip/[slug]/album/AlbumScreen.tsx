"use client";

import { useState } from "react";
import type { ThemeConfig } from "@/lib/theme/types";
import type { AlbumDaysConfig } from "@/lib/actions/album";
import { AlbumUploadForm } from "./AlbumUploadForm";
import { AlbumGrid } from "./AlbumGrid";
import { CollageBuilder } from "./CollageBuilder";
import { DigitalAlbumView } from "./DigitalAlbumView";
import { AlbumSettingsPanel } from "./AlbumSettingsPanel";

export type AlbumMediaItem = { id: string; type: "photo" | "video"; url: string; createdAt: string; dayIndex: number | null };
export type CuratedPhoto = { id: string; url: string; caption: string };

const TABS = [
  { key: "upload", label: "📤 העלאה" },
  { key: "collage", label: "🎬 קולאז׳ וידאו" },
  { key: "book", label: "📖 אלבום דיגיטלי" },
] as const;

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
}: {
  slug: string;
  destinationId: string;
  destinationName: string;
  theme: ThemeConfig;
  media: AlbumMediaItem[];
  curatedPhotos: CuratedPhoto[];
  tripDayCount: number;
  initialSettings: { templateKey: string; backgroundColor: string | null; days: AlbumDaysConfig };
}) {
  const [tab, setTab] = useState<TabKey>("upload");
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
        📸 האלבום שלי — {destinationName}
      </h1>
      <p className="mb-4 text-sm opacity-60">העלו תמונות וסרטונים מהטיול, צרו סרטון קולאז׳ אוטומטי, או צפו באלבום דיגיטלי מעוצב.</p>

      <div className="mb-5 flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className="rounded-full border px-4 py-1.5 text-sm font-semibold"
            style={{
              borderColor: "var(--primary)",
              background: tab === t.key ? "var(--primary)" : "transparent",
              color: tab === t.key ? "white" : "var(--text)",
            }}
          >
            {t.label}
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
          <AlbumSettingsPanel destinationId={destinationId} slug={slug} initialSettings={initialSettings} dayNumbers={titleableDayNumbers} />
          <DigitalAlbumView destinationName={destinationName} theme={theme} media={media} curatedPhotos={curatedPhotos} settings={initialSettings} />
        </div>
      )}
    </div>
  );
}
