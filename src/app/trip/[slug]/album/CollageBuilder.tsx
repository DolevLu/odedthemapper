"use client";

import { useRef, useState } from "react";
import { startAmbientMusic } from "@/lib/ambientMusic";

type Photo = { id: string; url: string };
type TransitionMode = "zoom" | "fade" | "slide";

const CANVAS_W = 960;
const CANVAS_H = 540;
const FPS = 30;
const MIN_SECONDS_PER_PHOTO = 1;
const MAX_SECONDS_PER_PHOTO = 6;
const DEFAULT_SECONDS_PER_PHOTO = 2.5;
// How much of each photo's own display time is spent transitioning into the
// next one — only used for "fade"/"slide" (zoom keeps the original hard cut).
const TRANSITION_OVERLAP_FRACTION = 0.25;

const TRANSITION_OPTIONS: { key: TransitionMode; label: string; hint: string }[] = [
  { key: "zoom", label: "🔍 זום (Ken Burns)", hint: "זום עדין בתוך כל תמונה, חיתוך ישיר בין תמונות" },
  { key: "fade", label: "🌫️ מעבר חלק (Fade)", hint: "תמונות עומדות, דהייה הדרגתית ביניהן" },
  { key: "slide", label: "➡️ החלקה (Slide)", hint: "תמונה חדשה מחליקה פנימה" },
];

function drawImageCover(ctx: CanvasRenderingContext2D, img: HTMLImageElement, w: number, h: number) {
  const imgRatio = img.width / img.height;
  const canvasRatio = w / h;
  let drawW: number;
  let drawH: number;
  if (imgRatio > canvasRatio) {
    drawH = h;
    drawW = drawH * imgRatio;
  } else {
    drawW = w;
    drawH = drawW / imgRatio;
  }
  ctx.drawImage(img, (w - drawW) / 2, (h - drawH) / 2, drawW, drawH);
}

function drawKenBurnsFrame(ctx: CanvasRenderingContext2D, img: HTMLImageElement, t: number, w: number, h: number) {
  const scale = 1 + 0.14 * t;
  const imgRatio = img.width / img.height;
  const canvasRatio = w / h;
  let drawW: number;
  let drawH: number;
  if (imgRatio > canvasRatio) {
    drawH = h * scale;
    drawW = drawH * imgRatio;
  } else {
    drawW = w * scale;
    drawH = drawW / imgRatio;
  }
  const x = (w - drawW) / 2 - (drawW - w) * 0.06 * t;
  const y = (h - drawH) / 2;

  ctx.fillStyle = "#111";
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(img, x, y, drawW, drawH);
}

/** Draws one output frame for `images[photoIndex]` at its own local progress
 * `localT` (0..1). For "fade"/"slide", the tail end of each photo's window
 * blends into the next photo; "zoom" keeps the original Ken-Burns-only, hard
 * cut behavior. */
function renderFrame(
  ctx: CanvasRenderingContext2D,
  images: HTMLImageElement[],
  photoIndex: number,
  localT: number,
  mode: TransitionMode,
  w: number,
  h: number
) {
  const curr = images[photoIndex];
  const next = images[photoIndex + 1];

  if (mode === "zoom") {
    drawKenBurnsFrame(ctx, curr, localT, w, h);
    return;
  }

  const inTransition = Boolean(next) && localT > 1 - TRANSITION_OVERLAP_FRACTION;
  if (!inTransition) {
    drawKenBurnsFrame(ctx, curr, 0, w, h);
    return;
  }

  const blendT = (localT - (1 - TRANSITION_OVERLAP_FRACTION)) / TRANSITION_OVERLAP_FRACTION;
  if (mode === "fade") {
    drawKenBurnsFrame(ctx, curr, 0, w, h);
    ctx.save();
    ctx.globalAlpha = blendT;
    drawImageCover(ctx, next!, w, h);
    ctx.restore();
  } else {
    const shift = blendT * w;
    ctx.fillStyle = "#111";
    ctx.fillRect(0, 0, w, h);
    ctx.save();
    ctx.translate(-shift, 0);
    drawImageCover(ctx, curr, w, h);
    ctx.restore();
    ctx.save();
    ctx.translate(w - shift, 0);
    drawImageCover(ctx, next!, w, h);
    ctx.restore();
  }
}

/** Real MP4 (H.264) is tried first — supported by Safari's MediaRecorder —
 * so the download is genuinely MP4 there; everywhere else (Chrome, Firefox)
 * falls back to WebM, since browsers can't be made to produce MP4 without a
 * much heavier client-side transcoder (e.g. ffmpeg.wasm). The UI is honest
 * about which one you actually got rather than mislabeling a WebM as MP4. */
const MIME_CANDIDATES = [
  "video/mp4;codecs=avc1",
  "video/mp4",
  "video/webm;codecs=vp9,opus",
  "video/webm;codecs=vp8,opus",
  "video/webm;codecs=vp9",
  "video/webm",
];

function drawCaption(ctx: CanvasRenderingContext2D, text: string, w: number, h: number) {
  const barH = 44;
  ctx.fillStyle = "rgba(0,0,0,0.45)";
  ctx.fillRect(0, h - barH, w, barH);
  ctx.fillStyle = "#fff";
  ctx.font = "600 20px Rubik, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, w / 2, h - barH / 2);
}

export function CollageBuilder({
  photos,
  destinationName,
  slug,
}: {
  photos: Photo[];
  destinationName: string;
  slug: string;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [rendering, setRendering] = useState(false);
  const [progress, setProgress] = useState(0);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videoExt, setVideoExt] = useState<"mp4" | "webm">("webm");
  const [error, setError] = useState<string | null>(null);
  const [transitionMode, setTransitionMode] = useState<TransitionMode>("zoom");
  const [secondsPerPhoto, setSecondsPerPhoto] = useState(DEFAULT_SECONDS_PER_PHOTO);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  function toggle(id: string) {
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function generate() {
    const chosen = photos.filter((p) => selected.has(p.id));
    if (chosen.length < 2) {
      setError("בחרו לפחות 2 תמונות ליצירת הסרטון");
      return;
    }
    if (typeof MediaRecorder === "undefined") {
      setError("הדפדפן הזה לא תומך ביצירת וידאו (נסו Chrome או Edge)");
      return;
    }

    setError(null);
    setVideoUrl(null);
    setRendering(true);
    setProgress(0);

    let music: ReturnType<typeof startAmbientMusic> | null = null;
    try {
      const canvas = canvasRef.current!;
      canvas.width = CANVAS_W;
      canvas.height = CANVAS_H;
      const ctx = canvas.getContext("2d")!;

      const images = await Promise.all(
        chosen.map(
          (p) =>
            new Promise<HTMLImageElement>((resolve, reject) => {
              const img = new Image();
              img.crossOrigin = "anonymous";
              img.onload = () => resolve(img);
              img.onerror = () => reject(new Error("image load failed"));
              img.src = p.url;
            })
        )
      );

      const totalDurationSec = images.length * secondsPerPhoto;
      music = startAmbientMusic(totalDurationSec);

      const stream = canvas.captureStream(FPS);
      const audioTrack = music.destinationStream.getAudioTracks()[0];
      if (audioTrack) stream.addTrack(audioTrack);

      const mimeType = MIME_CANDIDATES.find((t) => MediaRecorder.isTypeSupported(t)) ?? "video/webm";
      const ext: "mp4" | "webm" = mimeType.startsWith("video/mp4") ? "mp4" : "webm";
      setVideoExt(ext);
      const recorder = new MediaRecorder(stream, { mimeType });
      const chunks: BlobPart[] = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };
      const stopped = new Promise<void>((resolve) => {
        recorder.onstop = () => resolve();
      });
      recorder.start();

      const framesPerPhoto = Math.round(secondsPerPhoto * FPS);
      const totalFrames = images.length * framesPerPhoto;
      let frame = 0;
      const frameDurationMs = 1000 / FPS;

      for (let photoIndex = 0; photoIndex < images.length; photoIndex++) {
        for (let f = 0; f < framesPerPhoto; f++) {
          const t = f / framesPerPhoto;
          const start = performance.now();
          renderFrame(ctx, images, photoIndex, t, transitionMode, CANVAS_W, CANVAS_H);
          drawCaption(ctx, `✈️ ${destinationName} · עודד המנקד`, CANVAS_W, CANVAS_H);
          frame++;
          setProgress(Math.round((frame / totalFrames) * 100));
          const elapsed = performance.now() - start;
          await new Promise((r) => setTimeout(r, Math.max(0, frameDurationMs - elapsed)));
        }
      }

      recorder.stop();
      await stopped;
      const blob = new Blob(chunks, { type: mimeType });
      setVideoUrl(URL.createObjectURL(blob));
    } catch {
      setError("לא הצלחנו ליצור את הסרטון בדפדפן הזה — נסו תמונות אחרות או דפדפן אחר");
    } finally {
      music?.stop();
      setRendering(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-xs opacity-60">
        הסרטון נוצר אוטומטית בדפדפן שלכם (כתוביות ומוזיקת רקע רגועה) מהתמונות שתבחרו — ללא צורך בהעלאה לשרת חיצוני.
      </p>

      <div className="flex flex-col gap-3 border p-3" style={{ borderRadius: "var(--radius)", borderColor: "var(--primary)", background: "var(--surface)" }}>
        <div>
          <p className="mb-1.5 text-xs font-semibold opacity-70">אפקט מעבר בין תמונות</p>
          <div className="flex flex-wrap gap-2">
            {TRANSITION_OPTIONS.map((opt) => (
              <button
                key={opt.key}
                type="button"
                title={opt.hint}
                onClick={() => setTransitionMode(opt.key)}
                className="rounded-full border px-3 py-1.5 text-sm font-semibold"
                style={{
                  borderColor: "var(--primary)",
                  background: transitionMode === opt.key ? "var(--primary)" : "transparent",
                  color: transitionMode === opt.key ? "white" : "var(--text)",
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
        <label className="flex items-center gap-3 text-xs font-semibold opacity-70">
          משך כל תמונה — {secondsPerPhoto.toFixed(1)} שנ&apos;
          <input
            type="range"
            min={MIN_SECONDS_PER_PHOTO}
            max={MAX_SECONDS_PER_PHOTO}
            step={0.5}
            value={secondsPerPhoto}
            onChange={(e) => setSecondsPerPhoto(Number(e.target.value))}
            className="flex-1"
          />
        </label>
      </div>

      {photos.length === 0 ? (
        <p className="text-sm opacity-50">אין עדיין תמונות ליצירת קולאז׳ — העלו קודם כמה תמונות בטאב &quot;העלאה&quot;.</p>
      ) : (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
          {photos.map((p) => {
            const isSelected = selected.has(p.id);
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => toggle(p.id)}
                className="relative aspect-square overflow-hidden border-2"
                style={{ borderRadius: "var(--radius)", borderColor: isSelected ? "var(--primary)" : "transparent" }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.url} alt="" className="h-full w-full object-cover" loading="lazy" />
                {isSelected && (
                  <span
                    className="absolute end-1 top-1 flex h-5 w-5 items-center justify-center rounded-full text-xs text-white"
                    style={{ background: "var(--primary)" }}
                  >
                    ✓
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      <div className="flex items-center gap-3">
        <button
          onClick={generate}
          disabled={rendering || selected.size < 2}
          className="rounded-full px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
          style={{ background: "var(--primary)" }}
        >
          {rendering ? `יוצר סרטון... ${progress}%` : `יצירת סרטון (${selected.size} נבחרו)`}
        </button>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>

      <canvas ref={canvasRef} className="hidden" />

      {videoUrl && (
        <div className="flex flex-col items-start gap-2 border p-4" style={{ borderRadius: "var(--radius)", borderColor: "var(--primary)", background: "var(--surface)" }}>
          <video src={videoUrl} controls className="max-w-full" style={{ borderRadius: "var(--radius)" }} />
          <a
            href={videoUrl}
            download={`${slug}-collage.${videoExt}`}
            className="rounded-full px-4 py-2 text-sm font-semibold text-white"
            style={{ background: "var(--primary)" }}
          >
            הורדת הסרטון ({videoExt.toUpperCase()})
          </a>
          {videoExt === "webm" && (
            <p className="text-[11px] opacity-50">
              הדפדפן הזה יודע להקליט WebM בלבד (נגן בכל מקום, גם ברשתות חברתיות) — ב-Safari הקובץ יורד כ-MP4 אמיתי.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
