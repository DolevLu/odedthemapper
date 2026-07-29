"use client";

import { useMemo, useState } from "react";
import { submitQuizAttempt } from "@/lib/actions/quiz";

type Question = { id: string; category: string; question: string; options: string[]; correctIndex: number };

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function QuizGame({ destinationId, questions }: { destinationId: string; questions: Question[] }) {
  const set = useMemo(() => shuffle(questions).slice(0, 10), [questions]);
  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [done, setDone] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const current = set[index];

  function pick(optIndex: number) {
    if (selected !== null) return;
    setSelected(optIndex);
    if (optIndex === current.correctIndex) setScore((s) => s + 1);
  }

  function next() {
    if (index + 1 >= set.length) {
      setDone(true);
      if (!submitted) {
        setSubmitted(true);
        submitQuizAttempt(destinationId, score, set.length);
      }
      return;
    }
    setIndex((i) => i + 1);
    setSelected(null);
  }

  if (done) {
    const pct = Math.round((score / set.length) * 100);
    return (
      <div className="flex flex-col items-center gap-3 border p-8 text-center" style={{ borderRadius: "var(--radius)", borderColor: "var(--primary)", background: "var(--surface)" }}>
        <span className="text-4xl">{pct >= 80 ? "🏆" : pct >= 50 ? "👏" : "📚"}</span>
        <h2 className="text-xl font-bold">
          {score} / {set.length} תשובות נכונות
        </h2>
        <p className="text-sm opacity-60">{pct}% הצלחה</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-2 rounded-full px-5 py-2 text-sm font-semibold text-white"
          style={{ background: "var(--primary)" }}
        >
          נסו שוב
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between text-sm opacity-60">
        <span>
          שאלה {index + 1} מתוך {set.length}
        </span>
        <span>{current.category}</span>
      </div>
      <div className="border p-5" style={{ borderRadius: "var(--radius)", borderColor: "var(--primary)", background: "var(--surface)" }}>
        <p className="mb-4 font-semibold">{current.question}</p>
        <div className="flex flex-col gap-2">
          {current.options.map((opt, i) => {
            const isCorrect = i === current.correctIndex;
            const isSelected = i === selected;
            const showResult = selected !== null;
            return (
              <button
                key={i}
                onClick={() => pick(i)}
                disabled={selected !== null}
                className="rounded-lg border px-4 py-2.5 text-start text-sm"
                style={{
                  borderColor: showResult && isCorrect ? "#22c55e" : showResult && isSelected ? "#ef4444" : "var(--primary)",
                  background: showResult && isCorrect ? "#22c55e15" : showResult && isSelected ? "#ef444415" : "transparent",
                }}
              >
                {opt}
              </button>
            );
          })}
        </div>
      </div>
      {selected !== null && (
        <button onClick={next} className="self-start rounded-full px-5 py-2 text-sm font-semibold text-white" style={{ background: "var(--primary)" }}>
          {index + 1 >= set.length ? "סיום" : "הבא ←"}
        </button>
      )}
    </div>
  );
}
