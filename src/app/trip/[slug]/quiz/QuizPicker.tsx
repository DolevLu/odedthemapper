"use client";

import { useState } from "react";
import { QuizGame } from "./QuizGame";
import { useTranslation } from "@/components/i18n/LanguageContext";
import type { DictionaryKey } from "@/lib/i18n/dictionary";

type Question = { id: string; category: string; question: string; options: string[]; correctIndex: number };

const DECKS = [
  { key: "sports", labelKey: "tripQuiz.deck.sports", icon: "⚽", categories: ["sports"] },
  { key: "history", labelKey: "tripQuiz.deck.history", icon: "🏛️", categories: ["history"] },
  { key: "geography", labelKey: "tripQuiz.deck.geography", icon: "🌍", categories: ["geography", "politics", "culture", "food"] },
] satisfies { key: string; labelKey: DictionaryKey; icon: string; categories: string[] }[];

export function QuizPicker({ destinationId, questions }: { destinationId: string; questions: Question[] }) {
  const [activeDeck, setActiveDeck] = useState<(typeof DECKS)[number]["key"] | null>(null);
  const { t } = useTranslation();

  const decksWithQuestions = DECKS.map((deck) => ({
    ...deck,
    questions: questions.filter((q) => (deck.categories as readonly string[]).includes(q.category)),
  }));

  const active = decksWithQuestions.find((d) => d.key === activeDeck);
  if (active) {
    return (
      <div className="flex flex-col gap-3">
        <button onClick={() => setActiveDeck(null)} className="self-start text-sm font-semibold underline opacity-70">
          {t("tripQuiz.backToPicker")}
        </button>
        <QuizGame key={active.key} destinationId={destinationId} questions={active.questions} />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      {decksWithQuestions.map((deck) => (
        <button
          key={deck.key}
          onClick={() => deck.questions.length > 0 && setActiveDeck(deck.key)}
          disabled={deck.questions.length === 0}
          className="flex flex-col items-center gap-2 border p-6 text-center disabled:opacity-40"
          style={{ borderRadius: "var(--radius)", borderColor: "var(--primary)", background: "var(--surface)" }}
        >
          <span className="text-4xl">{deck.icon}</span>
          <span className="font-bold">{t(deck.labelKey)}</span>
          <span className="text-xs opacity-60">
            {deck.questions.length > 0 ? `${deck.questions.length} ${t("tripQuiz.questionsCount")}` : t("tripQuiz.comingSoon")}
          </span>
        </button>
      ))}
    </div>
  );
}
