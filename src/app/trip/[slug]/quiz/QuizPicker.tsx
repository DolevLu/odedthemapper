"use client";

import { useState } from "react";
import { QuizGame } from "./QuizGame";

type Question = { id: string; category: string; question: string; options: string[]; correctIndex: number };

const DECKS = [
  { key: "sports", label: "ספורט", icon: "⚽", categories: ["sports"] },
  { key: "history", label: "היסטוריה", icon: "🏛️", categories: ["history"] },
  { key: "geography", label: "גאוגרפיה ופרטים כלליים", icon: "🌍", categories: ["geography", "politics", "culture", "food"] },
] as const;

export function QuizPicker({ destinationId, questions }: { destinationId: string; questions: Question[] }) {
  const [activeDeck, setActiveDeck] = useState<(typeof DECKS)[number]["key"] | null>(null);

  const decksWithQuestions = DECKS.map((deck) => ({
    ...deck,
    questions: questions.filter((q) => (deck.categories as readonly string[]).includes(q.category)),
  }));

  const active = decksWithQuestions.find((d) => d.key === activeDeck);
  if (active) {
    return (
      <div className="flex flex-col gap-3">
        <button onClick={() => setActiveDeck(null)} className="self-start text-sm font-semibold underline opacity-70">
          ← חזרה לבחירת חידון
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
          <span className="font-bold">{deck.label}</span>
          <span className="text-xs opacity-60">
            {deck.questions.length > 0 ? `${deck.questions.length} שאלות` : "בקרוב"}
          </span>
        </button>
      ))}
    </div>
  );
}
