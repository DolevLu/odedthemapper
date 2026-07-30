import { notFound } from "next/navigation";
import { getDestinationBySlug } from "@/lib/data/destinations";
import { prisma } from "@/lib/prisma";
import { DESTINATION_LOCALE } from "@/lib/localeCodes";
import { PhraseCard } from "./PhraseCard";

export default async function PhrasebookPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const destination = await getDestinationBySlug(slug);
  if (!destination) notFound();

  const entries = await prisma.phrasebookEntry.findMany({ where: { destinationId: destination.id } });
  const locale = DESTINATION_LOCALE[slug] ?? "en-US";

  return (
    <div>
      <h1 className="mb-4 text-xl font-bold" style={{ fontFamily: "var(--font-heading)" }}>
        💬 שיחון — {destination.name}
      </h1>
      {entries.length === 0 ? (
        <p className="text-sm opacity-60">
          עדיין אין ביטויים ליעד הזה. האדמין יכול להוסיף מילים וביטויים חשובים בשפה המקומית דרך פאנל הניהול.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 sm:gap-3">
          {entries.map((entry) => (
            <PhraseCard
              key={entry.id}
              localPhrase={entry.localPhrase}
              translation={entry.translation}
              pronunciation={entry.pronunciation}
              locale={locale}
            />
          ))}
        </div>
      )}
    </div>
  );
}
