"use client";

import { useRef, useState } from "react";

type Photo = { id: string; url: string };

const CANVAS_W = 960;
const CANVAS_H = 540;
const SECONDS_PER_PHOTO = 2.2;
const FPS = 30;

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
  const [error, setError] = useState<string | null>(null);
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

      const stream = canvas.captureStream(FPS);
      const mimeType =
        ["video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm"].find((t) => MediaRecorder.isTypeSupported(t)) ?? "video/webm";
      const recorder = new MediaRecorder(stream, { mimeType });
      const chunks: BlobPart[] = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };
      const stopped = new Promise<void>((resolve) => {
        recorder.onstop = () => resolve();
      });
      recorder.start();

      const framesPerPhoto = Math.round(SECONDS_PER_PHOTO * FPS);
      const totalFrames = images.length * framesPerPhoto;
      let frame = 0;
      const frameDurationMs = 1000 / FPS;

      for (const img of images) {
        for (let f = 0; f < framesPerPhoto; f++) {
          const t = f / framesPerPhoto;
          const start = performance.now();
          drawKenBurnsFrame(ctx, img, t, CANVAS_W, CANVAS_H);
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
      setRendering(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-xs opacity-60">
        הסרטון נוצר אוטומטית בדפדפן שלכם (אפקט זום עדין + כתוביות) מהתמונות שתבחרו — ללא צורך בהעלאה לשרת חיצוני.
      </p>

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
            download={`${slug}-collage.webm`}
            className="rounded-full px-4 py-2 text-sm font-semibold text-white"
            style={{ background: "var(--primary)" }}
          >
            הורדת הסרטון
          </a>
        </div>
      )}
    </div>
  );
}
