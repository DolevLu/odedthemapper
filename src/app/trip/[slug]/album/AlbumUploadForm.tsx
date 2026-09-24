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

export function AlbumUploadForm({ destinationId, slug, variant = "hero" }: { destinationId: string; slug: string; variant?: "tile" | "hero" }) {
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

  const label = uploading ? `${progress?.done ?? 0}/${progress?.total ?? 0}` : null;

  return (
    <>
      <input ref={inputRef} type="file" accept="image/*,video/*" multiple disabled={uploading} onChange={(e) => handleFiles(e.target.files)} className="hidden" id={`album-upload-input-${variant}`} />
      {variant === "tile" ? (
        <label
          htmlFor={`album-upload-input-${variant}`}
          aria-disabled={uploading}
          className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-1 border-2 border-dashed text-center transition-colors hover:bg-black/5 aria-disabled:pointer-events-none aria-disabled:opacity-60"
          style={{ borderRadius: "calc(var(--radius) - 4px)", borderColor: "color-mix(in srgb, var(--primary) 45%, transparent)", color: "var(--primary)" }}
        >
          <span className="text-2xl font-light leading-none">{uploading ? "⏳" : "＋"}</span>
          <span className="px-1 text-[11px] font-semibold leading-tight">{label ?? t("album.uploadButton")}</span>
        </label>
      ) : (
        <label
          htmlFor={`album-upload-input-${variant}`}
          aria-disabled={uploading}
          className="flex cursor-pointer flex-col items-center gap-3 border-2 border-dashed px-6 py-12 text-center transition-colors hover:bg-black/5 aria-disabled:pointer-events-none aria-disabled:opacity-60"
          style={{ borderRadius: "calc(var(--radius) + 6px)", borderColor: "color-mix(in srgb, var(--primary) 45%, transparent)", background: "var(--surface)" }}
        >
          <span className="flex h-16 w-16 items-center justify-center rounded-full" style={{ background: "linear-gradient(135deg, #7C3AED22, #EC489922)" }}>
            <UploadIcon size={30} />
          </span>
          <span className="text-base font-bold">{uploading ? `${t("album.uploading")} ${label}` : t("album.uploadButton")}</span>
          <span className="text-xs opacity-55">{t("album.uploadHint")}</span>
        </label>
      )}
      {error && <p className="col-span-full text-xs text-red-600">{error}</p>}
    </>
  );
}
