"use client";

import { useState } from "react";
import Link from "next/link";
import { scoreDestinations, type QuizAnswers, type VibeTag } from "@/lib/destinationVibes";
import { generatePersonalizedSetup } from "@/lib/actions/quiz";

type Candidate = { id: string; slug: string; name: string; tagline: string | null; heroImage: string | null };

const VIBE_OPTIONS: { key: VibeTag; label: string; icon: string }[] = [
  { key: "beach", label: "חופים וים", icon: "🏖️" },
  { key: "nature", label: "טבע והרפתקה", icon: "🏔️" },
  { key: "culture", label: "תרבות והיסטוריה", icon: "🏛️" },
  { key: "nightlife", label: "חיי לילה", icon: "🍸" },
  { key: "food", label: "אוכל טוב", icon: "🍜" },
  { key: "romantic", label: "רומנטיקה", icon: "💕" },
  { key: "family", label: "טיול משפחתי", icon: "👨‍👩‍👧" },
  { key: "shopping", label: "שופינג", icon: "🛍️" },
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
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState<{ itemCount: number; favoriteCount: number } | null>(null);
  const [genError, setGenError] = useState<string | null>(null);

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
        <p className="text-sm font-semibold opacity-60">היעד המתאים לכם ביותר</p>
        {result.heroImage && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={result.heroImage} alt={result.name} className="h-40 w-full rounded-2xl object-cover" />
        )}
        <h2 className="text-3xl font-extrabold">{result.name}</h2>
        {result.tagline && <p className="opacity-70">{result.tagline}</p>}

        <div className="mt-2 flex flex-wrap justify-center gap-3">
          <Link
            href={`/trip/${result.slug}`}
            className="rounded-full border border-black/10 px-5 py-2.5 font-semibold"
          >
            צפייה חופשית ביעד
          </Link>
          {!hasAccess ? (
            <Link
              href={`/subscribe/family?dest=${result.slug}`}
              className="rounded-full px-5 py-2.5 font-bold text-white"
              style={{ background: "linear-gradient(135deg, #7C3AED, #EC4899)" }}
            >
              ✨ פתחו לי מערכת מותאמת אישית — $75
            </Link>
          ) : !generated ? (
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="rounded-full px-5 py-2.5 font-bold text-white disabled:opacity-50"
              style={{ background: "linear-gradient(135deg, #7C3AED, #EC4899)" }}
            >
              {generating ? "בונה עבורכם..." : "🪄 בנו לי מסלול, תקציב ומועדפים לפי התשובות"}
            </button>
          ) : null}
        </div>

        {!isLoggedIn && <p className="text-xs opacity-60">כדי לפתוח מערכת מותאמת אישית תצטרכו קודם להירשם.</p>}
        {genError && <p className="text-sm text-red-600">{genError}</p>}
        {generated && (
          <div className="mt-2 rounded-2xl bg-emerald-50 px-5 py-4 text-emerald-800">
            <p className="font-semibold">המערכת שלכם מוכנה! 🎉</p>
            <p className="text-sm">
              נבנה מסלול עם {generated.itemCount} נקודות, {generated.favoriteCount} מועדפים חדשים ותקציב מותאם.
            </p>
            <Link href={`/trip/${result.slug}/itinerary`} className="mt-2 inline-block text-sm font-semibold underline">
              למסלול שלי ←
            </Link>
          </div>
        )}

        <button onClick={() => setResult(null)} className="mt-2 text-sm opacity-60 underline">
          למלא שוב את השאלון
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
        <p className="mb-3 font-semibold">מה הכי מתאר את הטיול שאתם מחפשים? (אפשר לבחור כמה)</p>
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
              {v.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="text-sm font-semibold">
          כמה ימים מתכננים?
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
          מי נוסע?
          <select
            value={party}
            onChange={(e) => setParty(e.target.value as QuizAnswers["party"])}
            className="mt-1 block w-full rounded-lg border border-black/10 px-3 py-2 font-normal"
          >
            <option value="solo">לבד</option>
            <option value="couple">זוג</option>
            <option value="family">משפחה</option>
            <option value="friends">חברים</option>
          </select>
        </label>
        <label className="text-sm font-semibold">
          מתי מתכננים לטוס?
          <select
            value={season}
            onChange={(e) => setSeason(e.target.value as QuizAnswers["season"])}
            className="mt-1 block w-full rounded-lg border border-black/10 px-3 py-2 font-normal"
          >
            <option value="summer">קיץ</option>
            <option value="winter">חורף</option>
            <option value="spring">אביב</option>
            <option value="fall">סתיו</option>
          </select>
        </label>
        <label className="text-sm font-semibold">
          תקציב יומי משוער ($)
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
        מצאו לי יעד ✨
      </button>
    </form>
  );
}
