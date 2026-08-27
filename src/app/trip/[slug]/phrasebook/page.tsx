import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { getDestinationBySlug } from "@/lib/data/destinations";
import { prisma } from "@/lib/prisma";
import { DESTINATION_LOCALE } from "@/lib/localeCodes";
import { PhraseCard } from "./PhraseCard";

export default async function PhrasebookPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const destination = await getDestinationBySlug(slug);
  if (!destination) notFound();

  const session = await auth();
  const userId = session?.user?.id;

  const [entries, progress] = await Promise.all([
    prisma.phrasebookEntry.findMany({ where: { destinationId: destination.id } }),
    userId
      ? prisma.phrasebookProgress.findMany({ where: { userId, entry: { destinationId: destination.id } }, select: { entryId: true } })
      : Promise.resolve([]),
  ]);
  const knownIds = new Set(progress.map((p) => p.entryId));
  const locale = DESTINATION_LOCALE[slug] ?? "en-US";

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h1 className="text-xl font-bold" style={{ fontFamily: "var(--font-heading)" }}>
          💬 שיחון - {destination.name}
        </h1>
        {entries.length > 0 && userId && (
          <span className="shrink-0 rounded-full px-3 py-1 text-xs font-semibold" style={{ background: "color-mix(in srgb, var(--primary) 12%, transparent)", color: "var(--primary)" }}>
            ✓ {knownIds.size} / {entries.length} נלמדו
          </span>
        )}
      </div>
      {entries.length === 0 ? (
        <p className="text-sm opacity-60">
          עדיין אין ביטויים ליעד הזה. האדמין יכול להוסיף מילים וביטויים חשובים בשפה המקומית דרך פאנל הניהול.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 sm:gap-3">
          {entries.map((entry) => (
            <PhraseCard
              key={entry.id}
              entryId={entry.id}
              slug={slug}
              localPhrase={entry.localPhrase}
              translation={entry.translation}
              pronunciation={entry.pronunciation}
              locale={locale}
              known={knownIds.has(entry.id)}
              canTrack={Boolean(userId)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
