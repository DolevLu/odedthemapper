"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { uploadAlbumMedia } from "@/lib/actions/album";

export function AlbumUploadForm({ destinationId, slug }: { destinationId: string; slug: string }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();
  const [fileCount, setFileCount] = useState(0);

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      await uploadAlbumMedia(destinationId, slug, formData);
      if (inputRef.current) inputRef.current.value = "";
      setFileCount(0);
      router.refresh();
    });
  }

  return (
    <form
      action={handleSubmit}
      className="flex flex-wrap items-center gap-3 border p-4"
      style={{ borderRadius: "var(--radius)", borderColor: "var(--primary)", background: "var(--surface)" }}
    >
      <input
        ref={inputRef}
        type="file"
        name="files"
        accept="image/*,video/*"
        multiple
        onChange={(e) => setFileCount(e.target.files?.length ?? 0)}
        className="text-sm"
      />
      <button
        type="submit"
        disabled={pending || fileCount === 0}
        className="rounded-full px-5 py-2 text-sm font-semibold text-white disabled:opacity-50"
        style={{ background: "var(--primary)" }}
      >
        {pending ? "מעלה..." : fileCount > 0 ? `העלאת ${fileCount} קבצים` : "העלאה"}
      </button>
      <span className="text-xs opacity-50">תמונות וסרטונים מהטלפון או המחשב</span>
    </form>
  );
}
