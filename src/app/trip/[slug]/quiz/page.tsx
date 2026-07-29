import { notFound } from "next/navigation";
import { getDestinationBySlug } from "@/lib/data/destinations";
import { prisma } from "@/lib/prisma";
import { QuizGame } from "./QuizGame";

const CATEGORY_LABELS: Record<string, string> = {
  history: "היסטוריה",
  geography: "גאוגרפיה",
  politics: "פוליטיקה וחברה",
  sports: "ספורט",
  culture: "תרבות",
  food: "אוכל",
};

export default async function QuizPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const destination = await getDestinationBySlug(slug);
  if (!destination) notFound();

  const questions = await prisma.quizQuestion.findMany({ where: { destinationId: destination.id } });

  if (questions.length === 0) {
    return (
      <div>
        <h1 className="mb-2 text-xl font-bold">🧠 חידון {destination.name}</h1>
        <p className="text-sm opacity-60">עדיין אין חידון ליעד הזה — בקרוב!</p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="mb-1 text-xl font-bold" style={{ fontFamily: "var(--font-heading)" }}>
        🧠 חידון {destination.name}
      </h1>
      <p className="mb-4 text-sm opacity-60">כמה אתם מכירים את היעד שלכם? 10 שאלות בהיסטוריה, גאוגרפיה, תרבות ועוד.</p>
      <QuizGame
        destinationId={destination.id}
        questions={questions.map((q) => ({
          id: q.id,
          category: CATEGORY_LABELS[q.category] ?? q.category,
          question: q.question,
          options: JSON.parse(q.options) as string[],
          correctIndex: q.correctIndex,
        }))}
      />
    </div>
  );
}
