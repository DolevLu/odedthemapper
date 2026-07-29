import { notFound } from "next/navigation";
import { getDestinationBySlug } from "@/lib/data/destinations";
import { prisma } from "@/lib/prisma";

export default async function PhrasebookPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const destination = await getDestinationBySlug(slug);
  if (!destination) notFound();

  const entries = await prisma.phrasebookEntry.findMany({ where: { destinationId: destination.id } });

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
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {entries.map((entry) => (
            <div
              key={entry.id}
              className="flex flex-col gap-1 border p-4"
              style={{ borderRadius: "var(--radius)", borderColor: "var(--primary)", background: "var(--surface)" }}
            >
              <p className="text-lg font-semibold">{entry.localPhrase}</p>
              <p className="text-sm opacity-70">{entry.translation}</p>
              {entry.pronunciation && <p className="text-xs opacity-50">{entry.pronunciation}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
