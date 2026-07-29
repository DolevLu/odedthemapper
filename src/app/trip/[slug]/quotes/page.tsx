import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { getDestinationBySlug } from "@/lib/data/destinations";
import { getAccessLevel } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { UpgradeRequired } from "@/components/UpgradeRequired";
import { NewQuoteForm } from "./NewQuoteForm";
import { QuoteCard } from "./QuoteCard";

export default async function QuotesPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const destination = await getDestinationBySlug(slug);
  if (!destination) notFound();

  const session = await auth();
  const accessLevel = await getAccessLevel(session?.user?.id, destination.id);
  if (accessLevel !== "gold") return <UpgradeRequired tier="gold" />;

  const userId = session!.user!.id;

  const quotes = await prisma.priceQuote.findMany({
    where: { userId, destinationId: destination.id },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold">📄 הצעת מחיר וחוזים</h1>
        <p className="text-sm opacity-70">
          בנו הצעת מחיר מקצועית עבור לקוח, ושלחו לו קישור לאישור. המסמך נוצר אוטומטית מתבנית מקצועית ואינו מהווה חתימה
          אלקטרונית מאושרת כחוק.
        </p>
      </div>

      <NewQuoteForm destinationId={destination.id} slug={slug} />

      <div className="flex flex-col gap-3">
        {quotes.length === 0 && <p className="text-sm opacity-60">עדיין לא נוצרו הצעות מחיר ליעד הזה.</p>}
        {quotes.map((q) => (
          <QuoteCard
            key={q.id}
            slug={slug}
            quote={{
              id: q.id,
              clientName: q.clientName,
              tripDays: q.tripDays,
              totalLabel: `${((q.basePriceCents + (q.includesBooking ? q.bookingPriceCents : 0)) / 100).toFixed(0)} ${q.currency}`,
              status: q.status,
              shareToken: q.shareToken,
            }}
          />
        ))}
      </div>
    </div>
  );
}
