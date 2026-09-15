"use client";

import { useState } from "react";
import type { TripWrappedStats } from "@/lib/tripWrapped";
import { useTranslation } from "@/components/i18n/LanguageContext";
import type { DictionaryKey } from "@/lib/i18n/dictionary";

const SLIDE_GRADIENTS = [
  "linear-gradient(160deg, #7C3AED, #4C1D95)",
  "linear-gradient(160deg, #EC4899, #9D174D)",
  "linear-gradient(160deg, #F59E0B, #B45309)",
  "linear-gradient(160deg, #16A34A, #14532D)",
  "linear-gradient(160deg, #2563EB, #1E3A8A)",
  "linear-gradient(160deg, #DC2626, #7F1D1D)",
  "linear-gradient(160deg, #0EA5E9, #075985)",
];

function buildSlides(stats: TripWrappedStats, t: (key: DictionaryKey) => string): { title: string; big: string; sub?: string }[] {
  const slides = [
    { title: `${stats.flag ?? "✈️"} ${t("wrapped.yourTripTo")}${stats.destinationName}`, big: `${stats.daysTraveled} ${t("wrapped.days")}`, sub: t("wrapped.unforgettable") },
  ];
  if (stats.photosCount > 0) slides.push({ title: t("wrapped.caughtTheMoment"), big: String(stats.photosCount), sub: t("wrapped.photosInAlbum") });
  if (stats.kmWalked > 0) slides.push({ title: t("wrapped.walked"), big: `${stats.kmWalked} ${t("wrapped.km")}`, sub: t("wrapped.wholeJourney") });
  if (stats.spentCents > 0) slides.push({ title: t("wrapped.totalSpent"), big: `₪${Math.round(stats.spentCents / 100)}`, sub: t("wrapped.investedInMemories") });
  if (stats.poisFavorited > 0) slides.push({ title: t("wrapped.favoritePlaces"), big: String(stats.poisFavorited), sub: t("wrapped.savedToFavorites") });
  if (stats.quizBestPct !== null) slides.push({ title: t("wrapped.bestQuiz"), big: `${stats.quizBestPct}%`, sub: t("wrapped.correctAnswers") });
  slides.push({ title: t("wrapped.totalPointsFromTrip"), big: String(stats.pointsEarned), sub: t("wrapped.thanksForTraveling") });
  return slides;
}

export function TripWrappedModal({ stats, onClose }: { stats: TripWrappedStats; onClose: () => void }) {
  const [index, setIndex] = useState(0);
  const { t } = useTranslation();
  const slides = buildSlides(stats, t);
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
          <button onClick={prev} className="flex-1" aria-label={t("wrapped.previous")} />
          <button onClick={next} className="flex-1" aria-label={t("wrapped.next")} />
        </div>

        <button onClick={onClose} className="absolute end-4 top-4 z-10 text-xl opacity-80 hover:opacity-100" aria-label={t("nav.close")}>
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
