"use client";

import { useState } from "react";
import type { TripWrappedStats } from "@/lib/tripWrapped";

const SLIDE_GRADIENTS = [
  "linear-gradient(160deg, #7C3AED, #4C1D95)",
  "linear-gradient(160deg, #EC4899, #9D174D)",
  "linear-gradient(160deg, #F59E0B, #B45309)",
  "linear-gradient(160deg, #16A34A, #14532D)",
  "linear-gradient(160deg, #2563EB, #1E3A8A)",
  "linear-gradient(160deg, #DC2626, #7F1D1D)",
  "linear-gradient(160deg, #0EA5E9, #075985)",
];

function buildSlides(stats: TripWrappedStats): { title: string; big: string; sub?: string }[] {
  const slides = [
    { title: `${stats.flag ?? "✈️"} הטיול שלכם ל${stats.destinationName}`, big: `${stats.daysTraveled} ימים`, sub: "בלתי נשכחים" },
  ];
  if (stats.photosCount > 0) slides.push({ title: "📸 תפסתם את הרגע", big: String(stats.photosCount), sub: "תמונות באלבום" });
  if (stats.kmWalked > 0) slides.push({ title: "🚶 הלכתם ברגל", big: `${stats.kmWalked} ק״מ`, sub: "מסלול שלם של חוויות" });
  if (stats.spentCents > 0) slides.push({ title: "💸 סך ההוצאות", big: `₪${Math.round(stats.spentCents / 100)}`, sub: "השקעתם בזיכרונות" });
  if (stats.poisFavorited > 0) slides.push({ title: "❤️ מקומות אהובים", big: String(stats.poisFavorited), sub: "שמרתם למועדפים" });
  if (stats.quizBestPct !== null) slides.push({ title: "🧠 החידון הכי טוב שלכם", big: `${stats.quizBestPct}%`, sub: "תשובות נכונות" });
  slides.push({ title: "⭐ סה״כ נקודות מהטיול", big: String(stats.pointsEarned), sub: "תודה שטיילתם איתנו 🧭" });
  return slides;
}

export function TripWrappedModal({ stats, onClose }: { stats: TripWrappedStats; onClose: () => void }) {
  const [index, setIndex] = useState(0);
  const slides = buildSlides(stats);
  const slide = slides[index];

  function next() {
    if (index < slides.length - 1) setIndex(index + 1);
    else onClose();
  }
  function prev() {
    if (index > 0) setIndex(index - 1);
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.6)" }}>
      <div
        className="game-pop-in relative flex h-[560px] w-full max-w-sm flex-col items-center justify-center gap-3 overflow-hidden rounded-3xl p-8 text-center text-white shadow-2xl"
        style={{ background: SLIDE_GRADIENTS[index % SLIDE_GRADIENTS.length] }}
      >
        {/* Background tap zones (previous/next) painted first so the real
         * controls below stack visually on top and stay clickable. */}
        <div className="absolute inset-0 z-0 flex">
          <button onClick={prev} className="flex-1" aria-label="הקודם" />
          <button onClick={next} className="flex-1" aria-label="הבא" />
        </div>

        <button onClick={onClose} className="absolute end-4 top-4 z-10 text-xl opacity-80 hover:opacity-100" aria-label="סגירה">
          ✕
        </button>

        <div className="absolute inset-x-4 top-4 z-10 flex gap-1">
          {slides.map((_, i) => (
            <div key={i} className="h-1 flex-1 overflow-hidden rounded-full bg-white/25">
              <div className="h-full rounded-full bg-white" style={{ width: i <= index ? "100%" : "0%" }} />
            </div>
          ))}
        </div>

        <p className="relative z-10 mt-6 text-sm font-semibold opacity-80">{slide.title}</p>
        <p className="relative z-10 text-5xl font-extrabold">{slide.big}</p>
        {slide.sub && <p className="relative z-10 text-sm opacity-80">{slide.sub}</p>}

        {index === 1 && stats.highlightPhotos.length > 0 && (
          <div className="relative z-10 mt-2 grid grid-cols-3 gap-1.5">
            {stats.highlightPhotos.slice(0, 6).map((url, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={i} src={url} alt="" className="h-14 w-14 rounded-lg object-cover" style={{ transform: `rotate(${(i % 2 === 0 ? -1 : 1) * 4}deg)` }} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
