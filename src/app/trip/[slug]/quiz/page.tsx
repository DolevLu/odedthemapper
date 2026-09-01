import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { getDestinationBySlug } from "@/lib/data/destinations";
import { prisma } from "@/lib/prisma";
import { getVisitedCountryCodes, getCountryPhotos } from "@/lib/actions/visitedCountries";
import { VisitedCountriesMap } from "@/components/VisitedCountriesMap";
import { QuizPicker } from "./QuizPicker";

export default async function QuizPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [destination, session] = await Promise.all([getDestinationBySlug(slug), auth()]);
  if (!destination) notFound();
  const userId = session?.user?.id;

  const [questions, visitedCodes, photosByCountry] = await Promise.all([
    prisma.quizQuestion.findMany({ where: { destinationId: destination.id } }),
    userId ? getVisitedCountryCodes(userId) : Promise.resolve([]),
    userId ? getCountryPhotos(userId) : Promise.resolve({}),
  ]);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="mb-1 text-xl font-bold" style={{ fontFamily: "var(--font-heading)" }}>
          🧠 חידונים - {destination.name}
        </h1>
        {questions.length === 0 ? (
          <p className="text-sm opacity-60">עדיין אין חידונים ליעד הזה - בקרוב!</p>
        ) : (
          <>
            <p className="mb-4 text-sm opacity-60">בחרו נושא - כמה אתם מכירים את היעד שלכם?</p>
            <QuizPicker
              destinationId={destination.id}
              questions={questions.map((q) => ({
                id: q.id,
                category: q.category,
                question: q.question,
                options: JSON.parse(q.options) as string[],
                correctIndex: q.correctIndex,
              }))}
            />
          </>
        )}
      </div>

      <VisitedCountriesMap initialVisited={visitedCodes} photosByCountry={photosByCountry} slug={slug} />
    </div>
  );
}
