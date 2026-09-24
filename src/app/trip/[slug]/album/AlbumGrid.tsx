"use client";

import { useEffect, useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { deleteAlbumMedia, setAlbumMediaDay } from "@/lib/actions/album";
import type { AlbumMediaItem } from "./AlbumScreen";
import { useTranslation } from "@/components/i18n/LanguageContext";

/** The trip's photos and videos, grouped by day. Tapping one opens it full screen, where it can be moved to another
 * day or deleted - those controls used to appear only on hover, which never happens on a phone. */
export function AlbumGrid({ media, slug, dayOptions, uploadTile }: { media: AlbumMediaItem[]; slug: string; dayOptions: number[]; uploadTile?: ReactNode }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [openId, setOpenId] = useState<string | null>(null);
  const { t } = useTranslation();

  // Days in order, "no day" last; each keeps its upload order (newest first).
  const dayKeys = Array.from(new Set(media.map((m) => m.dayIndex))).sort((a, b) => (a ?? 1e9) - (b ?? 1e9));
  const flat = dayKeys.flatMap((d) => media.filter((m) => m.dayIndex === d));
  const openIndex = openId ? flat.findIndex((m) => m.id === openId) : -1;
  const current = openIndex >= 0 ? flat[openIndex] : null;

  useEffect(() => {
    if (!current) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpenId(null);
      // The page is RTL, so "next" is the left arrow.
      if (e.key === "ArrowLeft" && openIndex < flat.length - 1) setOpenId(flat[openIndex + 1].id);
      if (e.key === "ArrowRight" && openIndex > 0) setOpenId(flat[openIndex - 1].id);
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [current, openIndex, flat]);

  function handleDelete(id: string) {
    if (!window.confirm(t("album.delete") + "?")) return;
    const next = flat[openIndex + 1] ?? flat[openIndex - 1] ?? null;
    setOpenId(next ? next.id : null);
    startTransition(async () => {
      await deleteAlbumMedia(id, slug);
      router.refresh();
    });
  }

  function handleDayChange(id: string, value: string) {
    startTransition(async () => {
      await setAlbumMediaDay(id, slug, value ? Number(value) : null);
      router.refresh();
    });
  }

  if (media.length === 0) return <>{uploadTile}</>;

  return (
    <div className="flex flex-col gap-5">
      {dayKeys.map((d, gi) => {
        const items = media.filter((m) => m.dayIndex === d);
        return (
          <section key={d ?? "none"}>
            <h3 className="mb-1.5 flex items-baseline gap-2 px-0.5 text-sm font-bold">
              {d != null ? `${t("album.day")} ${d}` : t("album.noDay")}
              <span className="text-xs font-normal opacity-50">{items.length}</span>
            </h3>
            <div className="grid grid-cols-3 gap-1 sm:grid-cols-4 sm:gap-1.5 lg:grid-cols-5">
              {gi === 0 && uploadTile}
              {items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setOpenId(item.id)}
                  className="group relative aspect-square overflow-hidden bg-black/5"
                  style={{ borderRadius: "calc(var(--radius) - 4px)" }}
                >
                  {item.type === "video" ? (
                    <>
                      <video src={item.url} className="h-full w-full object-cover" muted preload="metadata" />
                      <span className="pointer-events-none absolute bottom-1 start-1 rounded-full bg-black/60 px-1.5 py-0.5 text-[10px] text-white">▶ {t("album.video")}</span>
                    </>
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.url} alt="" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" loading="lazy" />
                  )}
                </button>
              ))}
            </div>
          </section>
        );
      })}

      {current && (
        <div className="fixed inset-0 z-[60] flex flex-col bg-black/95 text-white" role="dialog" aria-modal="true">
          <div className="flex items-center justify-between gap-2 p-3">
            <button type="button" onClick={() => setOpenId(null)} className="flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-lg" aria-label="✕">
              ✕
            </button>
            <span className="text-xs opacity-60">
              {openIndex + 1} / {flat.length}
            </span>
            <button type="button" onClick={() => handleDelete(current.id)} disabled={pending} className="flex h-10 items-center gap-1.5 rounded-full bg-white/15 px-4 text-sm disabled:opacity-50">
              🗑 {t("album.delete")}
            </button>
          </div>
          <div className="relative flex min-h-0 flex-1 items-center justify-center px-2" onClick={() => setOpenId(null)}>
            {current.type === "video" ? (
              <video src={current.url} controls autoPlay playsInline className="max-h-full max-w-full" onClick={(e) => e.stopPropagation()} />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={current.url} alt="" className="max-h-full max-w-full object-contain" onClick={(e) => e.stopPropagation()} />
            )}
            {openIndex > 0 && (
              <button type="button" onClick={(e) => { e.stopPropagation(); setOpenId(flat[openIndex - 1].id); }} className="absolute end-2 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/20 text-xl" aria-label="prev">
                ›
              </button>
            )}
            {openIndex < flat.length - 1 && (
              <button type="button" onClick={(e) => { e.stopPropagation(); setOpenId(flat[openIndex + 1].id); }} className="absolute start-2 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/20 text-xl" aria-label="next">
                ‹
              </button>
            )}
          </div>
          <div className="flex items-center justify-center gap-2 p-4" style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}>
            <span className="text-sm opacity-70">{t("album.dayAssignTitle")}</span>
            <select
              value={current.dayIndex ?? ""}
              onChange={(e) => handleDayChange(current.id, e.target.value)}
              disabled={pending}
              className="rounded-full bg-white/15 px-4 py-2 text-sm font-semibold text-white"
            >
              <option value="" className="text-black">
                {t("album.noDay")}
              </option>
              {dayOptions.map((d) => (
                <option key={d} value={d} className="text-black">
                  {t("album.day")} {d}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}
    </div>
  );
}
