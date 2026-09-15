"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { upload } from "@vercel/blob/client";
import { recordAlbumMedia } from "@/lib/actions/album";
import { useTranslation } from "@/components/i18n/LanguageContext";

/** A clean "upload" glyph (arrow into a tray) — own original path, not a
 * traced/vendor icon — filled in the app's own brand gradient so it reads
 * clearly as "add media" at a glance instead of relying on the OS's own
 * generic file-picker button styling. */
function UploadIcon({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <defs>
        <linearGradient id="upload-icon-gradient" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#7C3AED" />
          <stop offset="100%" stopColor="#EC4899" />
        </linearGradient>
      </defs>
      <path d="M12 2L6 9h3v6h6V9h3z M4 18h16v2.5H4z" fill="url(#upload-icon-gradient)" />
    </svg>
  );
}

function safeName(name: string): string {
  return name.replace(/[^a-zA-Z0-9.\-_]/g, "_");
}

export function AlbumUploadForm({ destinationId, slug }: { destinationId: string; slug: string }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { t } = useTranslation();

  async function handleFiles(fileList: FileList | null) {
    const files = Array.from(fileList ?? []).filter((f) => f.size > 0);
    if (files.length === 0) return;

    setUploading(true);
    setError(null);
    setProgress({ done: 0, total: files.length });

    let failures = 0;
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const type = file.type.startsWith("video/") ? "video" : "photo";
      try {
        const blob = await upload(`album/${destinationId}/${Date.now()}-${crypto.randomUUID().slice(0, 8)}-${safeName(file.name)}`, file, {
          access: "public",
          handleUploadUrl: "/api/album/upload",
        });
        await recordAlbumMedia(destinationId, slug, type, blob.url);
      } catch (err) {
        failures++;
        console.error("Album upload failed for", file.name, err);
      }
      setProgress({ done: i + 1, total: files.length });
    }

    setUploading(false);
    setProgress(null);
    if (inputRef.current) inputRef.current.value = "";
    if (failures > 0) {
      setError(
        failures === files.length
          ? t("album.uploadAllFailed")
          : `${failures} ${t("album.uploadPartialFailed")} ${files.length} ${t("album.uploadPartialFailedSuffix")}`
      );
    }
    router.refresh();
  }

  return (
    <div className="flex flex-wrap items-center gap-3 border p-4" style={{ borderRadius: "var(--radius)", borderColor: "var(--primary)", background: "var(--surface)" }}>
      <input
        ref={inputRef}
        type="file"
        accept="image/*,video/*"
        multiple
        disabled={uploading}
        onChange={(e) => handleFiles(e.target.files)}
        className="hidden"
        id="album-upload-input"
      />
      <label
        htmlFor="album-upload-input"
        className="flex cursor-pointer items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-transform hover:-translate-y-0.5 aria-disabled:pointer-events-none aria-disabled:opacity-50"
        aria-disabled={uploading}
        style={{ background: "linear-gradient(135deg, #7C3AED, #EC4899)" }}
      >
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white">
          <UploadIcon size={16} />
        </span>
        {uploading ? `${t("album.uploading")} ${progress?.done ?? 0}/${progress?.total ?? 0}` : t("album.uploadButton")}
      </label>
      <span className="text-xs opacity-50">{t("album.uploadHint")}</span>
      {error && <p className="w-full text-xs text-red-600">{error}</p>}
    </div>
  );
}
