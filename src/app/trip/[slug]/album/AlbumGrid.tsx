"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteAlbumMedia } from "@/lib/actions/album";
import type { AlbumMediaItem } from "./AlbumScreen";

export function AlbumGrid({ media, slug }: { media: AlbumMediaItem[]; slug: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function handleDelete(id: string) {
    startTransition(async () => {
      await deleteAlbumMedia(id, slug);
      router.refresh();
    });
  }

  if (media.length === 0) {
    return <p className="text-sm opacity-50">עדיין לא העליתם תמונות או סרטונים. הראשונים שלכם יופיעו כאן.</p>;
  }

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
      {media.map((item) => (
        <div key={item.id} className="group relative aspect-square overflow-hidden" style={{ borderRadius: "var(--radius)" }}>
          {item.type === "video" ? (
            <video src={item.url} className="h-full w-full object-cover" muted />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={item.url} alt="" className="h-full w-full object-cover" loading="lazy" />
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
        </div>
      ))}
    </div>
  );
}
