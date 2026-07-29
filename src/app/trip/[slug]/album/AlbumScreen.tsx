"use client";

import { useState } from "react";
import type { ThemeConfig } from "@/lib/theme/types";
import { AlbumUploadForm } from "./AlbumUploadForm";
import { AlbumGrid } from "./AlbumGrid";
import { CollageBuilder } from "./CollageBuilder";
import { DigitalAlbumView } from "./DigitalAlbumView";

export type AlbumMediaItem = { id: string; type: "photo" | "video"; url: string; createdAt: string };
export type CuratedPhoto = { id: string; url: string; caption: string };

const TABS = [
  { key: "upload", label: "📤 העלאה" },
  { key: "collage", label: "🎬 קולאז׳ וידאו" },
  { key: "book", label: "📖 אלבום דיגיטלי" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export function AlbumScreen({
  slug,
  destinationId,
  destinationName,
  theme,
  media,
  curatedPhotos,
}: {
  slug: string;
  destinationId: string;
  destinationName: string;
  theme: ThemeConfig;
  media: AlbumMediaItem[];
  curatedPhotos: CuratedPhoto[];
}) {
  const [tab, setTab] = useState<TabKey>("upload");
  const allPhotos = [
    ...media.filter((m) => m.type === "photo").map((m) => ({ id: m.id, url: m.url })),
    ...curatedPhotos.map((p) => ({ id: p.id, url: p.url })),
  ];

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
          <AlbumGrid media={media} slug={slug} />
        </div>
      )}

      {tab === "collage" && <CollageBuilder photos={allPhotos} destinationName={destinationName} slug={slug} />}

      {tab === "book" && (
        <DigitalAlbumView destinationName={destinationName} theme={theme} media={media} curatedPhotos={curatedPhotos} />
      )}
    </div>
  );
}
