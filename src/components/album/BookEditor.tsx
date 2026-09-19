"use client";

import { useState } from "react";
import {
  BOOK_LOOKS,
  FRAME_STYLES,
  LOOK_STYLES,
  PAGE_LAYOUTS,
  emptyPage,
  newPageId,
  withLayout,
  type AlbumBook,
  type BookPage,
  type PageLayout,
} from "@/lib/albumBook";
import { BookPageView } from "./BookPageView";
import { useTranslation } from "@/components/i18n/LanguageContext";
import type { DictionaryKey } from "@/lib/i18n/dictionary";

const LAYOUT_LABEL: Record<PageLayout, DictionaryKey> = {
  cover: "book.layout.cover",
  full: "book.layout.full",
  duo: "book.layout.duo",
  trio: "book.layout.trio",
  quad: "book.layout.quad",
  collage: "book.layout.collage",
  quote: "book.layout.quote",
};
const LAYOUT_ICON: Record<PageLayout, string> = { cover: "🖼️", full: "▣", duo: "◫", trio: "◩", quad: "▦", collage: "▤", quote: "❝" };
const FRAME_LABEL = { clean: "book.frame.clean", polaroid: "book.frame.polaroid", tape: "book.frame.tape", film: "book.frame.film" } as const satisfies Record<string, DictionaryKey>;
const LOOK_LABEL = { paper: "book.look.paper", night: "book.look.night", sunset: "book.look.sunset", ocean: "book.look.ocean", mono: "book.look.mono" } as const satisfies Record<string, DictionaryKey>;

/** The page-by-page designer: pick a page, choose its layout and frame style,
 * fill each slot from the photo tray, write a title and caption, reorder or
 * add pages. Fully controlled - the parent owns the book and saves it. */
export function BookEditor({
  book,
  onChange,
  tray,
  saving,
}: {
  book: AlbumBook;
  onChange: (book: AlbumBook) => void;
  tray: { id: string; url: string }[];
  saving: "idle" | "saving" | "saved";
}) {
  const { t } = useTranslation();
  const [pageIdx, setPageIdx] = useState(0);
  const [slot, setSlot] = useState<number | null>(0);
  const pageCount = book.pages.length;
  const safeIdx = Math.min(pageIdx, pageCount - 1);
  const page = book.pages[safeIdx];
  const used = new Set(book.pages.flatMap((p) => p.photos).filter(Boolean));

  function setPages(pages: BookPage[], nextIdx = safeIdx) {
    onChange({ ...book, pages });
    setPageIdx(Math.max(0, Math.min(nextIdx, pages.length - 1)));
  }
  const patch = (changes: Partial<BookPage>) => setPages(book.pages.map((p, i) => (i === safeIdx ? { ...p, ...changes } : p)));

  function placePhoto(url: string) {
    const target = slot ?? page.photos.findIndex((u) => !u);
    const i = target == null || target < 0 ? 0 : target;
    if (page.photos.length === 0) return; // quote page has no photo slots
    const photos = [...page.photos];
    photos[i] = url;
    patch({ photos });
    // Jump to the next empty slot so filling a page is a run of taps.
    const nextEmpty = photos.findIndex((u, k) => !u && k !== i);
    setSlot(nextEmpty >= 0 ? nextEmpty : i);
  }

  function move(delta: -1 | 1) {
    const to = safeIdx + delta;
    if (to < 0 || to >= pageCount) return;
    const pages = [...book.pages];
    [pages[safeIdx], pages[to]] = [pages[to], pages[safeIdx]];
    setPages(pages, to);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold opacity-60">{t("book.looks")}</span>
        {BOOK_LOOKS.map((l) => (
          <button
            key={l}
            onClick={() => onChange({ ...book, look: l })}
            aria-label={t(LOOK_LABEL[l])}
            title={t(LOOK_LABEL[l])}
            className="h-7 w-7 rounded-full border-2"
            style={{ background: LOOK_STYLES[l].cover, borderColor: book.look === l ? "var(--primary,#7C3AED)" : "rgba(0,0,0,.15)" }}
          />
        ))}
        <span className="ms-auto text-xs opacity-60" role="status">
          {saving === "saving" ? t("book.saving") : saving === "saved" ? `✓ ${t("book.saved")}` : ""}
        </span>
      </div>

      <div className="grid gap-4 md:grid-cols-[minmax(0,340px)_1fr]">
        <div className="flex flex-col items-center gap-3">
          <div className="aspect-[4/5] w-full max-w-[340px] overflow-hidden rounded-xl shadow-xl" style={{ boxShadow: "0 18px 44px -16px rgba(0,0,0,.45)" }}>
            <BookPageView page={page} look={book.look} editable selectedSlot={slot} onSlotClick={setSlot} />
          </div>
          <div className="flex flex-wrap justify-center gap-1.5">
            <button onClick={() => move(-1)} disabled={safeIdx === 0} className="rounded-full border px-3 py-1 text-xs font-semibold disabled:opacity-30" aria-label={t("book.moveEarlier")}>
              ⇧ {t("book.moveEarlier")}
            </button>
            <button onClick={() => move(1)} disabled={safeIdx === pageCount - 1} className="rounded-full border px-3 py-1 text-xs font-semibold disabled:opacity-30" aria-label={t("book.moveLater")}>
              ⇩ {t("book.moveLater")}
            </button>
            <button
              onClick={() => setPages([...book.pages.slice(0, safeIdx + 1), { ...page, id: newPageId() }, ...book.pages.slice(safeIdx + 1)], safeIdx + 1)}
              className="rounded-full border px-3 py-1 text-xs font-semibold"
            >
              ⧉ {t("book.duplicate")}
            </button>
            <button
              onClick={() => pageCount > 1 && setPages(book.pages.filter((_, i) => i !== safeIdx), safeIdx)}
              disabled={pageCount <= 1}
              className="rounded-full border px-3 py-1 text-xs font-semibold text-red-600 disabled:opacity-30"
            >
              🗑 {t("book.deletePage")}
            </button>
          </div>
        </div>

        <div className="flex min-w-0 flex-col gap-3">
          <div>
            <p className="mb-1 text-xs font-semibold opacity-60">{t("book.layout")}</p>
            <div className="flex flex-wrap gap-1.5">
              {PAGE_LAYOUTS.map((l) => (
                <button
                  key={l}
                  onClick={() => {
                    patch(withLayout(page, l));
                    setSlot(0);
                  }}
                  className="rounded-lg border px-2.5 py-1.5 text-xs font-semibold"
                  style={{ borderColor: page.layout === l ? "var(--primary,#7C3AED)" : "rgba(0,0,0,.15)", background: page.layout === l ? "color-mix(in srgb,var(--primary,#7C3AED) 12%,transparent)" : "transparent" }}
                >
                  <span aria-hidden className="me-1">{LAYOUT_ICON[l]}</span>
                  {t(LAYOUT_LABEL[l])}
                </button>
              ))}
            </div>
          </div>

          {page.layout !== "cover" && page.layout !== "quote" && (
            <div>
              <p className="mb-1 text-xs font-semibold opacity-60">{t("book.frame")}</p>
              <div className="flex flex-wrap gap-1.5">
                {FRAME_STYLES.map((f) => (
                  <button
                    key={f}
                    onClick={() => patch({ frame: f })}
                    className="rounded-lg border px-2.5 py-1.5 text-xs font-semibold"
                    style={{ borderColor: page.frame === f ? "var(--primary,#7C3AED)" : "rgba(0,0,0,.15)", background: page.frame === f ? "color-mix(in srgb,var(--primary,#7C3AED) 12%,transparent)" : "transparent" }}
                  >
                    {t(FRAME_LABEL[f])}
                  </button>
                ))}
              </div>
            </div>
          )}

          <label className="text-xs font-semibold opacity-80">
            {page.layout === "quote" ? t("book.quoteText") : t("book.pageTitle")}
            <input
              value={page.title}
              maxLength={80}
              onChange={(e) => patch({ title: e.target.value })}
              className="mt-1 block w-full rounded-lg border px-3 py-2 text-sm font-normal"
              style={{ borderColor: "rgba(0,0,0,.2)", background: "var(--surface,#fff)" }}
            />
          </label>
          <label className="text-xs font-semibold opacity-80">
            {t("book.pageCaption")}
            <textarea
              value={page.caption}
              maxLength={280}
              rows={2}
              onChange={(e) => patch({ caption: e.target.value })}
              className="mt-1 block w-full rounded-lg border px-3 py-2 text-sm font-normal"
              style={{ borderColor: "rgba(0,0,0,.2)", background: "var(--surface,#fff)" }}
            />
          </label>

          {page.photos.length > 0 && (
            <div>
              <p className="mb-1 text-xs font-semibold opacity-60">
                {t("book.tray")} <span className="font-normal">({t("book.trayHint")})</span>
              </p>
              {tray.length === 0 ? (
                <p className="text-sm opacity-60">{t("book.trayEmpty")}</p>
              ) : (
                <div className="grid max-h-52 grid-cols-4 gap-1.5 overflow-y-auto sm:grid-cols-6">
                  {tray.map((p) => (
                    <button key={p.id} onClick={() => placePhoto(p.url)} className="relative aspect-square overflow-hidden rounded-md" aria-label={t("book.placePhoto")}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={p.url} alt="" className="h-full w-full object-cover" loading="lazy" />
                      {used.has(p.url) && <span className="absolute end-1 top-1 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-white" />}
                    </button>
                  ))}
                </div>
              )}
              {page.photos[slot ?? 0] && (
                <button onClick={() => patch({ photos: page.photos.map((u, i) => (i === (slot ?? 0) ? "" : u)) })} className="mt-1.5 text-xs underline opacity-70">
                  {t("book.clearSlot")}
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      <div>
        <p className="mb-1 text-xs font-semibold opacity-60">{t("book.pages")}</p>
        <div className="flex gap-2 overflow-x-auto pb-2">
          {book.pages.map((p, i) => (
            <button
              key={p.id}
              onClick={() => {
                setPageIdx(i);
                setSlot(0);
              }}
              className="relative w-16 shrink-0 overflow-hidden rounded-md border-2"
              style={{ borderColor: i === safeIdx ? "var(--primary,#7C3AED)" : "rgba(0,0,0,.15)" }}
              aria-label={`${t("book.page")} ${i + 1}`}
            >
              <div className="aspect-[4/5] w-full">
                <BookPageView page={p} look={book.look} />
              </div>
              <span className="absolute bottom-0 start-0 rounded-se bg-black/60 px-1 text-[10px] font-bold text-white">{i + 1}</span>
            </button>
          ))}
          <button
            onClick={() => setPages([...book.pages, emptyPage("duo")], pageCount)}
            className="flex aspect-[4/5] w-16 shrink-0 items-center justify-center rounded-md border-2 border-dashed text-2xl opacity-70 hover:opacity-100"
            aria-label={t("book.addPage")}
          >
            ＋
          </button>
        </div>
      </div>
    </div>
  );
}
