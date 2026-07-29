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

  const revenueCents = quotes.reduce((s, q) => s + q.basePriceCents + (q.includesBooking ? q.bookingPriceCents : 0), 0);
  const costCents = quotes.reduce((s, q) => s + q.costCents, 0);
  const profitCents = revenueCents - costCents;
  const closedWon = quotes.filter((q) => q.leadStatus === "closed_won").length;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold">📊 CRM — לידים והצעות מחיר</h1>
        <p className="text-sm opacity-70">
          נהלו את הלידים שלכם, בנו הצעת מחיר מקצועית ושלחו ללקוח לאישור וחתימה. המסמך נוצר אוטומטית מתבנית מקצועית
          ואינו מהווה חתימה אלקטרונית מאושרת כחוק.
        </p>
      </div>

      {quotes.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-2xl border border-black/5 p-3 text-center" style={{ background: "var(--surface)" }}>
            <p className="text-lg font-extrabold">{quotes.length}</p>
            <p className="text-xs opacity-60">לידים</p>
          </div>
          <div className="rounded-2xl border border-black/5 p-3 text-center" style={{ background: "var(--surface)" }}>
            <p className="text-lg font-extrabold">{closedWon}</p>
            <p className="text-xs opacity-60">נסגרו בהצלחה</p>
          </div>
          <div className="rounded-2xl border border-black/5 p-3 text-center" style={{ background: "var(--surface)" }}>
            <p className="text-lg font-extrabold">${(revenueCents / 100).toFixed(0)}</p>
            <p className="text-xs opacity-60">הכנסה כוללת</p>
          </div>
          <div className="rounded-2xl border border-black/5 p-3 text-center" style={{ background: "var(--surface)" }}>
            <p className="text-lg font-extrabold">${(profitCents / 100).toFixed(0)}</p>
            <p className="text-xs opacity-60">רווח כולל</p>
          </div>
        </div>
      )}

      <NewQuoteForm destinationId={destination.id} slug={slug} />

      <div className="flex flex-col gap-3">
        {quotes.length === 0 && <p className="text-sm opacity-60">עדיין לא נוצרו לידים ליעד הזה.</p>}
        {quotes.map((q) => (
          <QuoteCard
            key={q.id}
            slug={slug}
            quote={{
              id: q.id,
              clientName: q.clientName,
              tripDays: q.tripDays,
              totalLabel: `${((q.basePriceCents + (q.includesBooking ? q.bookingPriceCents : 0)) / 100).toFixed(0)} ${q.currency}`,
              profitLabel: `$${((q.basePriceCents + (q.includesBooking ? q.bookingPriceCents : 0) - q.costCents) / 100).toFixed(0)}`,
              status: q.status,
              leadStatus: q.leadStatus,
              shareToken: q.shareToken,
              signed: Boolean(q.signatureDataUrl),
            }}
          />
        ))}
      </div>
    </div>
  );
}
