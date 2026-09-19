"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { AlbumBook } from "@/lib/albumBook";
import { BookPageView } from "./BookPageView";
import { translate, type Lang } from "@/lib/i18n/dictionary";

const AUTOPLAY_MS = 4500;

/** The album read as a book: one page at a time with a page-turn animation,
 * arrows / keyboard / swipe, dots, a slideshow, and fullscreen. Used by the
 * editor's preview, the sample album and the public share page, so it takes
 * `lang` as a prop instead of reading a client-only hook. */
export function BookViewer({ book, lang = "he", title }: { book: AlbumBook; lang?: Lang; title?: string }) {
  const t = (key: Parameters<typeof translate>[1]) => translate(lang, key);
  const rtl = lang === "he";
  const total = book.pages.length;
  const [index, setIndex] = useState(0);
  const [turn, setTurn] = useState<"next" | "prev" | null>(null);
  const [playing, setPlaying] = useState(false);
  const stageRef = useRef<HTMLDivElement>(null);
  const touchX = useRef<number | null>(null);

  const go = useCallback(
    (delta: 1 | -1) => {
      setIndex((i) => {
        const next = Math.min(total - 1, Math.max(0, i + delta));
        if (next !== i) setTurn(delta === 1 ? "next" : "prev");
        return next;
      });
    },
    [total]
  );

  // A Hebrew book opens right-to-left: the "next" arrow points left.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowRight") go(rtl ? -1 : 1);
      else if (e.key === "ArrowLeft") go(rtl ? 1 : -1);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, rtl]);

  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => {
      setIndex((i) => {
        if (i >= total - 1) {
          setPlaying(false);
          return i;
        }
        setTurn("next");
        return i + 1;
      });
    }, AUTOPLAY_MS);
    return () => clearInterval(id);
  }, [playing, total]);

  // Warm the next page's photos so the turn never shows an empty frame.
  useEffect(() => {
    const next = book.pages[index + 1];
    next?.photos.filter(Boolean).forEach((u) => {
      const img = new Image();
      img.src = u;
    });
  }, [book.pages, index]);

  function fullscreen() {
    const el = stageRef.current;
    if (!el) return;
    if (document.fullscreenElement) void document.exitFullscreen();
    else void el.requestFullscreen?.();
  }

  const page = book.pages[Math.min(index, total - 1)];
  const prevLabel = rtl ? "›" : "‹";
  const nextLabel = rtl ? "‹" : "›";

  return (
    <div ref={stageRef} className="flex flex-col items-center gap-3 bg-[color:var(--surface,#fff)] p-2 [&:fullscreen]:justify-center [&:fullscreen]:bg-black">
      <style>{`
        @keyframes book-turn-next { from { opacity:0; transform: perspective(1400px) rotateY(${rtl ? "" : "-"}38deg) translateX(${rtl ? "-" : ""}6%); } to { opacity:1; transform:none; } }
        @keyframes book-turn-prev { from { opacity:0; transform: perspective(1400px) rotateY(${rtl ? "-" : ""}38deg) translateX(${rtl ? "" : "-"}6%); } to { opacity:1; transform:none; } }
        .book-turn-next { animation: book-turn-next .5s cubic-bezier(.2,.7,.2,1); transform-origin: ${rtl ? "right" : "left"} center; }
        .book-turn-prev { animation: book-turn-prev .5s cubic-bezier(.2,.7,.2,1); transform-origin: ${rtl ? "right" : "left"} center; }
        @media (prefers-reduced-motion: reduce) { .book-turn-next, .book-turn-prev { animation: none; } }
      `}</style>

      <div className="flex w-full max-w-[520px] items-center gap-2" dir={rtl ? "rtl" : "ltr"}>
        <button
          onClick={() => go(-1)}
          disabled={index === 0}
          aria-label={t("book.prev")}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border text-2xl shadow-sm disabled:opacity-30"
          style={{ background: "var(--surface,#fff)", borderColor: "rgba(0,0,0,.12)" }}
        >
          {prevLabel}
        </button>

        <div
          className="min-w-0 flex-1 [perspective:1400px]"
          onTouchStart={(e) => (touchX.current = e.touches[0].clientX)}
          onTouchEnd={(e) => {
            if (touchX.current == null) return;
            const dx = e.changedTouches[0].clientX - touchX.current;
            touchX.current = null;
            if (Math.abs(dx) < 40) return;
            // swipe toward the page edge moves forward, like turning a real page
            go((dx < 0) === !rtl ? 1 : -1);
          }}
        >
          <div
            key={page.id + index}
            className={`aspect-[4/5] w-full overflow-hidden rounded-2xl shadow-2xl ${turn === "next" ? "book-turn-next" : turn === "prev" ? "book-turn-prev" : ""}`}
            style={{ boxShadow: "0 24px 60px -18px rgba(0,0,0,.45), 0 0 0 1px rgba(0,0,0,.06)" }}
          >
            <BookPageView page={page} look={book.look} />
          </div>
        </div>

        <button
          onClick={() => go(1)}
          disabled={index === total - 1}
          aria-label={t("book.next")}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border text-2xl shadow-sm disabled:opacity-30"
          style={{ background: "var(--surface,#fff)", borderColor: "rgba(0,0,0,.12)" }}
        >
          {nextLabel}
        </button>
      </div>

      <div className="flex w-full max-w-[520px] items-center justify-between gap-2 text-xs" dir={rtl ? "rtl" : "ltr"}>
        <span dir="ltr" className="tabular-nums opacity-60" aria-live="polite">
          {index + 1} / {total}
        </span>
        <div className="flex max-w-[60%] flex-wrap justify-center gap-1">
          {book.pages.map((p, i) => (
            <button
              key={p.id}
              onClick={() => {
                setTurn(i > index ? "next" : "prev");
                setIndex(i);
              }}
              aria-label={`${t("book.page")} ${i + 1}`}
              className="h-2 rounded-full transition-all"
              style={{ width: i === index ? 18 : 8, background: i === index ? "var(--primary,#7C3AED)" : "rgba(0,0,0,.2)" }}
            />
          ))}
        </div>
        <div className="flex gap-1.5">
          <button onClick={() => setPlaying((p) => !p)} className="rounded-full border px-2.5 py-1 font-semibold" style={{ borderColor: "rgba(0,0,0,.15)" }}>
            {playing ? `⏸ ${t("book.pause")}` : `▶ ${t("book.play")}`}
          </button>
          <button onClick={fullscreen} className="rounded-full border px-2.5 py-1 font-semibold" style={{ borderColor: "rgba(0,0,0,.15)" }} aria-label={t("book.fullscreen")}>
            ⛶
          </button>
        </div>
      </div>
      {title && <p className="sr-only">{title}</p>}
    </div>
  );
}
