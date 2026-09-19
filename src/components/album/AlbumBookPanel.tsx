"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { autoBuildBook, parseBook, sampleBook, serializeBook, type AlbumBook } from "@/lib/albumBook";
import { saveAlbumBook, ensureAlbumShareToken } from "@/lib/actions/album";
import { BookViewer } from "./BookViewer";
import { BookEditor } from "./BookEditor";
import { useTranslation } from "@/components/i18n/LanguageContext";

type Mode = "view" | "edit" | "sample";

/** The album's flip-book tab: view it as a book, design it page by page, or
 * see the example album every destination ships with. */
export function AlbumBookPanel({
  destinationId,
  destinationName,
  slug,
  media,
  samplePhotos,
  initialBookJson,
  dayConfig,
  onGoUpload,
}: {
  destinationId: string;
  destinationName: string;
  slug: string;
  media: { id: string; url: string; type: "photo" | "video"; dayIndex: number | null }[];
  samplePhotos: { url: string; caption: string }[];
  initialBookJson: string | null;
  dayConfig: Record<string, { title?: string; subtitle?: string }>;
  onGoUpload: () => void;
}) {
  const { t, lang } = useTranslation();
  const photos = useMemo(() => media.filter((m) => m.type === "photo"), [media]);
  const [book, setBook] = useState<AlbumBook | null>(() => parseBook(initialBookJson));
  const [mode, setMode] = useState<Mode>(() => (parseBook(initialBookJson) ? "view" : "sample"));
  const [saving, setSaving] = useState<"idle" | "saving" | "saved">("idle");
  const [sharing, setSharing] = useState(false);
  const [shareMsg, setShareMsg] = useState<string | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const firstRender = useRef(true);

  const sample = useMemo(
    () =>
      sampleBook(samplePhotos, destinationName, {
        subtitle: t("book.sample.subtitle"),
        dayPrefix: t("digitalAlbum.day"),
        quote: t("book.sample.quote"),
        caption: t("book.sample.caption"),
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [samplePhotos, destinationName, lang]
  );

  // Autosave: 800ms after the last edit.
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    if (!book || mode !== "edit") return;
    setSaving("saving");
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      try {
        await saveAlbumBook(destinationId, slug, serializeBook(book));
        setSaving("saved");
      } catch {
        setSaving("idle");
      }
    }, 800);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [book, mode, destinationId, slug]);

  function buildFromPhotos() {
    const built = autoBuildBook(
      photos.map((p) => ({ url: p.url, dayIndex: p.dayIndex })),
      dayConfig,
      destinationName,
      t("digitalAlbum.day")
    );
    setBook(built);
    setMode("edit");
  }

  async function share() {
    setSharing(true);
    setShareMsg(null);
    try {
      const token = await ensureAlbumShareToken(destinationId, slug);
      const url = `${window.location.origin}/share/album/${token}`;
      if (navigator.share) await navigator.share({ title: destinationName, url }).catch(() => {});
      else {
        await navigator.clipboard.writeText(url);
        setShareMsg(t("book.linkCopied"));
      }
    } catch {
      setShareMsg(t("weather.loadFailed"));
    }
    setSharing(false);
  }

  const tab = (m: Mode, label: string, disabled = false) => (
    <button
      key={m}
      onClick={() => setMode(m)}
      disabled={disabled}
      className="rounded-full px-4 py-1.5 text-sm font-semibold disabled:opacity-40"
      style={{ background: mode === m ? "var(--primary)" : "transparent", color: mode === m ? "white" : "var(--text)" }}
    >
      {label}
    </button>
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex gap-1 rounded-full bg-black/5 p-1">
          {tab("view", t("book.mode.view"), !book)}
          {tab("edit", t("book.mode.edit"), !book)}
          {tab("sample", t("book.mode.sample"), !sample)}
        </div>
        {book && (
          <button onClick={share} disabled={sharing} className="ms-auto rounded-full border px-4 py-1.5 text-sm font-semibold disabled:opacity-50" style={{ borderColor: "var(--primary)" }}>
            🔗 {t("book.share")}
          </button>
        )}
      </div>
      {shareMsg && <p className="text-xs font-semibold text-emerald-600" role="status">{shareMsg}</p>}

      {mode === "sample" && (
        <div className="flex flex-col gap-3">
          <div className="rounded-xl p-3 text-sm" style={{ background: "color-mix(in srgb,var(--primary) 10%, var(--surface))" }}>
            <p className="font-semibold">📖 {t("book.sample.title")}</p>
            <p className="mt-0.5 opacity-70">{t("book.sample.body")}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {photos.length > 0 ? (
                <button onClick={buildFromPhotos} className="rounded-full px-4 py-2 text-sm font-bold text-white" style={{ background: "linear-gradient(135deg,#7C3AED,#EC4899)" }}>
                  ✨ {t("book.autoBuild")}
                </button>
              ) : (
                <button onClick={onGoUpload} className="rounded-full px-4 py-2 text-sm font-bold text-white" style={{ background: "var(--primary)" }}>
                  📷 {t("book.uploadFirst")}
                </button>
              )}
            </div>
          </div>
          {sample ? <BookViewer book={sample} lang={lang} /> : <p className="text-sm opacity-60">{t("book.noSample")}</p>}
        </div>
      )}

      {mode === "view" && book && <BookViewer book={book} lang={lang} />}

      {mode === "edit" && book && (
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap gap-2">
            {photos.length > 0 && (
              <button
                onClick={() => {
                  if (window.confirm(t("book.autoBuildConfirm"))) buildFromPhotos();
                }}
                className="rounded-full border px-3 py-1.5 text-xs font-semibold"
                style={{ borderColor: "var(--primary)" }}
              >
                ✨ {t("book.autoBuild")}
              </button>
            )}
          </div>
          <BookEditor book={book} onChange={setBook} tray={photos.map((p) => ({ id: p.id, url: p.url }))} saving={saving} />
        </div>
      )}
    </div>
  );
}
