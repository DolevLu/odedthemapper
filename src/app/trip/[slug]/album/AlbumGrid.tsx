"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteAlbumMedia, setAlbumMediaDay } from "@/lib/actions/album";
import type { AlbumMediaItem } from "./AlbumScreen";

export function AlbumGrid({ media, slug, dayOptions }: { media: AlbumMediaItem[]; slug: string; dayOptions: number[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function handleDelete(id: string) {
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

  if (media.length === 0) {
    return <p className="text-sm opacity-50">עדיין לא העליתם תמונות או סרטונים. הראשונים שלכם יופיעו כאן.</p>;
  }

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
      {media.map((item, i) => (
        <div
          key={item.id}
          className="game-pop-in group relative aspect-square overflow-hidden transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-md"
          style={{ borderRadius: "var(--radius)", animationDelay: `${Math.min(i, 12) * 30}ms` }}
        >
          {item.type === "video" ? (
            <video src={item.url} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" muted />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={item.url} alt="" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" loading="lazy" />
          )}
          <button
            onClick={() => handleDelete(item.id)}
            disabled={pending}
            className="absolute end-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-sm text-white opacity-0 transition-opacity group-hover:opacity-100 disabled:opacity-50"
            title="מחיקה"
          >
            ✕
          </button>
          {item.type === "video" && (
            <span className="pointer-events-none absolute bottom-1.5 start-1.5 rounded-full bg-black/60 px-2 py-0.5 text-[10px] text-white">
              ▶ וידאו
            </span>
          )}
          <select
            value={item.dayIndex ?? ""}
            onChange={(e) => handleDayChange(item.id, e.target.value)}
            disabled={pending}
            className="absolute bottom-1.5 end-1.5 rounded-md border-0 bg-black/60 px-1.5 py-0.5 text-[10px] font-semibold text-white"
            title="שיוך לפי יום בטיול - לחלוקת האלבום הדיגיטלי"
          >
            <option value="">ללא יום</option>
            {dayOptions.map((d) => (
              <option key={d} value={d}>
                יום {d}
              </option>
            ))}
          </select>
        </div>
      ))}
    </div>
  );
}
