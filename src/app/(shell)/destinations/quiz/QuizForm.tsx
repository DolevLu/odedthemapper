"use client";

import { useState } from "react";
import Link from "next/link";
import { scoreDestinations, recommendedBaseFor, type QuizAnswers, type VibeTag } from "@/lib/destinationVibes";
import { generatePersonalizedSetup } from "@/lib/actions/quiz";
import { useTranslation } from "@/components/i18n/LanguageContext";
import type { DictionaryKey } from "@/lib/i18n/dictionary";

type Candidate = { id: string; slug: string; name: string; tagline: string | null; heroImage: string | null };

const VIBE_OPTIONS: { key: VibeTag; labelKey: DictionaryKey; icon: string }[] = [
  { key: "beach", labelKey: "destQuiz.vibe.beach", icon: "🏖️" },
  { key: "nature", labelKey: "destQuiz.vibe.nature", icon: "🏔️" },
  { key: "culture", labelKey: "destQuiz.vibe.culture", icon: "🏛️" },
  { key: "nightlife", labelKey: "destQuiz.vibe.nightlife", icon: "🍸" },
  { key: "food", labelKey: "destQuiz.vibe.food", icon: "🍜" },
  { key: "romantic", labelKey: "destQuiz.vibe.romantic", icon: "💕" },
  { key: "family", labelKey: "destQuiz.vibe.family", icon: "👨‍👩‍👧" },
  { key: "shopping", labelKey: "destQuiz.vibe.shopping", icon: "🛍️" },
];

export function QuizForm({
  candidates,
  purchasedSlugs,
  isLoggedIn,
}: {
  candidates: Candidate[];
  purchasedSlugs: string[];
  isLoggedIn: boolean;
}) {
  const [vibes, setVibes] = useState<VibeTag[]>([]);
  const [tripDays, setTripDays] = useState(5);
  const [party, setParty] = useState<QuizAnswers["party"]>("couple");
  const [season, setSeason] = useState<QuizAnswers["season"]>("summer");
  const [dailyBudget, setDailyBudget] = useState(100);
  const [result, setResult] = useState<Candidate | null>(null);
  const [recommendedBase, setRecommendedBase] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState<{ itemCount: number; favoriteCount: number } | null>(null);
  const [genError, setGenError] = useState<string | null>(null);
  const { t } = useTranslation();

  function toggleVibe(v: VibeTag) {
    setVibes((cur) => (cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v]));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const answers: QuizAnswers = { vibes, tripDays, party, season, dailyBudget };
    const scored = scoreDestinations(
      candidates.map((c) => c.slug),
      answers
    );
    const top = scored[0];
    const match = candidates.find((c) => c.slug === top?.slug) ?? null;
    setResult(match);
    setRecommendedBase(match ? recommendedBaseFor(match.slug, answers) : null);
    setGenerated(null);
    setGenError(null);
  }

  async function handleGenerate() {
    if (!result) return;
    setGenerating(true);
    setGenError(null);
    const answers: QuizAnswers = { vibes, tripDays, party, season, dailyBudget };
    const res = await generatePersonalizedSetup(result.id, result.slug, answers);
    setGenerating(false);
    if (!res.ok) {
      setGenError(res.error);
      return;
    }
    setGenerated({ itemCount: res.itemCount, favoriteCount: res.favoriteCount });
  }

  if (result) {
    const hasAccess = purchasedSlugs.includes(result.slug);
    return (
      <div
        className="flex flex-col items-center gap-4 rounded-3xl border border-black/5 bg-white p-8 text-center shadow-sm"
        style={{ borderRadius: "1.5rem" }}
      >
        <p className="text-sm font-semibold opacity-60">{t("destQuiz.bestMatch")}</p>
        {result.heroImage && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={result.heroImage} alt={result.name} className="h-40 w-full rounded-2xl object-cover" />
        )}
        <h2 className="text-3xl font-extrabold">{result.name}</h2>
        {result.tagline && <p className="opacity-70">{result.tagline}</p>}
        {recommendedBase && (
          <p className="rounded-full px-4 py-1.5 text-sm font-semibold" style={{ background: "#F3EEFF", color: "#7C3AED" }}>
            {t("destQuiz.recommendedBaseOn")} {recommendedBase}
          </p>
        )}

        <div className="mt-2 flex flex-wrap justify-center gap-3">
          <Link
            href={`/trip/${result.slug}`}
            className="rounded-full border border-black/10 px-5 py-2.5 font-semibold"
          >
            {t("destQuiz.freeView")}
          </Link>
          {!hasAccess ? (
            <Link
              href={`/subscribe/family?dest=${result.slug}`}
              className="rounded-full px-5 py-2.5 font-bold text-white"
              style={{ background: "linear-gradient(135deg, #7C3AED, #EC4899)" }}
            >
              {t("destQuiz.unlockPersonalized")}
            </Link>
          ) : !generated ? (
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="rounded-full px-5 py-2.5 font-bold text-white disabled:opacity-50"
              style={{ background: "linear-gradient(135deg, #7C3AED, #EC4899)" }}
            >
              {generating ? t("destQuiz.building") : t("destQuiz.buildForMe")}
            </button>
          ) : null}
        </div>

        {!isLoggedIn && <p className="text-xs opacity-60">{t("destQuiz.needToRegister")}</p>}
        {genError && <p className="text-sm text-red-600">{genError}</p>}
        {generated && (
          <div className="mt-2 rounded-2xl bg-emerald-50 px-5 py-4 text-emerald-800">
            <p className="font-semibold">{t("destQuiz.systemReady")}</p>
            <p className="text-sm">
              {t("destQuiz.builtRoutePrefix")} {generated.itemCount} {t("destQuiz.builtRouteMid")} {generated.favoriteCount}{" "}
              {t("destQuiz.builtRouteSuffix")}
            </p>
            <Link href={`/trip/${result.slug}/itinerary`} className="mt-2 inline-block text-sm font-semibold underline">
              {t("destQuiz.toMyRoute")}
            </Link>
          </div>
        )}

        <button onClick={() => setResult(null)} className="mt-2 text-sm opacity-60 underline">
          {t("destQuiz.fillAgain")}
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-6 rounded-3xl border border-black/5 bg-white p-8 shadow-sm"
      style={{ borderRadius: "1.5rem" }}
    >
      <div>
        <p className="mb-3 font-semibold">{t("destQuiz.vibesQuestion")}</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {VIBE_OPTIONS.map((v) => (
            <button
              key={v.key}
              type="button"
              onClick={() => toggleVibe(v.key)}
              className="flex flex-col items-center gap-1 rounded-2xl border p-3 text-sm font-medium transition-colors"
              style={{
                borderColor: vibes.includes(v.key) ? "#7C3AED" : "rgba(0,0,0,0.1)",
                background: vibes.includes(v.key) ? "#F3EEFF" : "white",
              }}
            >
              <span className="text-xl">{v.icon}</span>
              {t(v.labelKey)}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="text-sm font-semibold">
          {t("destQuiz.howManyDays")}
          <input
            type="number"
            min={1}
            max={21}
            value={tripDays}
            onChange={(e) => setTripDays(Number(e.target.value))}
            className="mt-1 block w-full rounded-lg border border-black/10 px-3 py-2 font-normal"
          />
        </label>
        <label className="text-sm font-semibold">
          {t("destQuiz.whoTravels")}
          <select
            value={party}
            onChange={(e) => setParty(e.target.value as QuizAnswers["party"])}
            className="mt-1 block w-full rounded-lg border border-black/10 px-3 py-2 font-normal"
          >
            <option value="solo">{t("destQuiz.party.solo")}</option>
            <option value="couple">{t("destQuiz.party.couple")}</option>
            <option value="family">{t("destQuiz.party.family")}</option>
            <option value="friends">{t("destQuiz.party.friends")}</option>
          </select>
        </label>
        <label className="text-sm font-semibold">
          {t("destQuiz.whenFlying")}
          <select
            value={season}
            onChange={(e) => setSeason(e.target.value as QuizAnswers["season"])}
            className="mt-1 block w-full rounded-lg border border-black/10 px-3 py-2 font-normal"
          >
            <option value="summer">{t("destQuiz.season.summer")}</option>
            <option value="winter">{t("destQuiz.season.winter")}</option>
            <option value="spring">{t("destQuiz.season.spring")}</option>
            <option value="fall">{t("destQuiz.season.fall")}</option>
          </select>
        </label>
        <label className="text-sm font-semibold">
          {t("destQuiz.dailyBudget")}
          <input
            type="number"
            min={10}
            step={10}
            value={dailyBudget}
            onChange={(e) => setDailyBudget(Number(e.target.value))}
            className="mt-1 block w-full rounded-lg border border-black/10 px-3 py-2 font-normal"
          />
        </label>
      </div>

      <button
        type="submit"
        disabled={vibes.length === 0}
        className="rounded-full px-6 py-3 font-bold text-white disabled:opacity-50"
        style={{ background: "linear-gradient(135deg, #7C3AED, #EC4899)" }}
      >
        {t("destQuiz.findMyDestination")}
      </button>
    </form>
  );
}
