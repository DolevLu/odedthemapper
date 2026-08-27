import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { generateQuoteDocument } from "@/lib/quoteTemplate";
import { PrintButton } from "../../itinerary/[token]/PrintButton";
import { AcceptQuoteButton } from "./AcceptQuoteButton";

export default async function SharedQuotePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  const quote = await prisma.priceQuote.findUnique({
    where: { shareToken: token },
    include: { destination: true, user: { include: { plannerProfile: true } } },
  });
  if (!quote) notFound();

  const plannerName = quote.user.plannerProfile?.companyName ?? "עודד המנקד";
  const { totalCents, sections } = generateQuoteDocument({
    quoteNumber: quote.id.slice(-8).toUpperCase(),
    createdAt: quote.createdAt,
    plannerName,
    clientName: quote.clientName,
    destinationName: quote.destination.name,
    tripDays: quote.tripDays,
    basePriceCents: quote.basePriceCents,
    includesBooking: quote.includesBooking,
    bookingPriceCents: quote.bookingPriceCents,
    currency: quote.currency,
    notes: quote.notes,
  });

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-6 py-12 print:py-4">
      <div className="flex items-center justify-between gap-3 border-b pb-4" style={{ borderColor: "#1A1A1A22" }}>
        <div className="flex items-center gap-3">
          {quote.user.plannerProfile?.logoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={quote.user.plannerProfile.logoUrl} alt="" className="h-10 w-10 rounded-lg object-contain" />
          )}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-mark.svg" alt="עודד המנקד" className="h-10 w-10" />
          <div>
            <p className="text-xs font-bold tracking-wide opacity-70">
              {quote.user.plannerProfile?.companyName ? `${quote.user.plannerProfile.companyName} · עודד המנקד` : "עודד המנקד"}
            </p>
            <p className="text-sm opacity-60">הצעת מחיר והסכם התקשרות</p>
          </div>
        </div>
        <PrintButton />
      </div>

      <div>
        <h1 className="text-2xl font-extrabold">
          הצעת מחיר עבור {quote.clientName} - {quote.destination.name}
        </h1>
        <p className="text-sm opacity-60">מסמך מס' {quote.id.slice(-8).toUpperCase()}</p>
      </div>

      <div className="flex flex-col gap-5">
        {sections.map((section) => (
          <div key={section.heading} className="rounded-2xl border-2 p-5" style={{ borderColor: "#1A1A1A22" }}>
            <h2 className="mb-2 text-base font-bold">{section.heading}</h2>
            <div className="flex flex-col gap-1 text-sm leading-relaxed opacity-80">
              {section.body.map((line, i) => (
                <p key={i}>{line}</p>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-2xl p-5 text-center text-lg font-extrabold text-white" style={{ background: "var(--primary, #1A1A1A)" }}>
        סה&quot;כ: {(totalCents / 100).toFixed(0)} {quote.currency}
      </div>

      <AcceptQuoteButton token={token} alreadyAccepted={quote.status === "accepted"} />

      {quote.signatureDataUrl && quote.signedAt && (
        <div className="flex flex-col items-center gap-1 border-t pt-4 text-center" style={{ borderColor: "#1A1A1A22" }}>
          <p className="text-xs opacity-50">
            נחתם ב-{quote.signedAt.toLocaleDateString("he-IL")} בשעה {quote.signedAt.toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" })}
          </p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={quote.signatureDataUrl} alt="חתימה" className="h-16 opacity-80" />
        </div>
      )}

      <p className="print:hidden mt-2 text-center text-xs opacity-50">
        מסמך זה נוצר אוטומטית מתבנית מקצועית של עודד המנקד ואינו מהווה ייעוץ משפטי.
      </p>
    </div>
  );
}
