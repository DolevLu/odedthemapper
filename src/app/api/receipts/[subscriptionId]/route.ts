import { NextResponse } from "next/server";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { canManageContent } from "@/lib/access";
import { PLANS, formatIls, type PlanKey } from "@/lib/plans";

const DATE_FMT = new Intl.DateTimeFormat("he-IL", { day: "numeric", month: "long", year: "numeric" });

/**
 * A simple payment-confirmation PDF — deliberately NOT a legally-compliant
 * Israeli tax invoice (חשבונית מס), which requires sequential numbering and
 * reporting to the tax authority via a real invoicing service. This is a
 * free, no-account-needed receipt: proof of what was paid, when, for what —
 * good enough for a customer's own records, not for accounting/VAT purposes.
 * Text is written LTR (numbers/Latin) since pdf-lib's StandardFonts have no
 * Hebrew glyphs — labels are kept in English for that reason.
 */
export async function GET(request: Request, { params }: { params: Promise<{ subscriptionId: string }> }) {
  const { subscriptionId } = await params;
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const subscription = await prisma.subscription.findUnique({
    where: { id: subscriptionId },
    include: { user: true, destinations: { include: { destination: true } } },
  });
  if (!subscription) return NextResponse.json({ error: "not found" }, { status: 404 });

  const isOwner = subscription.userId === session.user.id;
  const isAdmin = await canManageContent(session.user.id);
  if (!isOwner && !isAdmin) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const plan = PLANS[subscription.planKey as PlanKey];
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([420, 560]);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const purple = rgb(0.486, 0.227, 0.929);
  const gray = rgb(0.45, 0.45, 0.45);
  let y = 500;

  const draw = (text: string, opts: { size?: number; f?: typeof font; color?: ReturnType<typeof rgb>; gap?: number } = {}) => {
    page.drawText(text, { x: 40, y, size: opts.size ?? 11, font: opts.f ?? font, color: opts.color ?? rgb(0, 0, 0) });
    y -= opts.gap ?? (opts.size ?? 11) + 10;
  };

  draw("Oded HaMapper - Travi", { size: 20, f: bold, color: purple, gap: 26 });
  draw("Payment Receipt", { size: 13, f: bold, gap: 22 });
  draw(`Receipt for subscription #${subscription.id.slice(0, 10)}`, { size: 9, color: gray, gap: 24 });

  draw(`Date: ${subscription.paidAt ? DATE_FMT.format(subscription.paidAt) : DATE_FMT.format(subscription.createdAt)}`);
  draw(`Customer: ${subscription.user.email}`);
  draw(`Plan: ${plan?.name ?? subscription.planKey} (${subscription.billingCycle})`);
  if (!plan?.isOrgTier && subscription.destinations.length > 0) {
    draw(`Destinations: ${subscription.destinations.map((d) => d.destination.name).join(", ")}`);
  }
  y -= 10;
  draw(
    subscription.grantedByAdmin ? "Amount: Complimentary (granted, ₪0)" : `Amount paid: ${formatIls(subscription.amountCents)}`,
    { size: 14, f: bold, gap: 30 }
  );

  page.drawLine({ start: { x: 40, y: y + 10 }, end: { x: 380, y: y + 10 }, thickness: 0.5, color: rgb(0.85, 0.85, 0.85) });
  y -= 20;
  draw("This is a payment confirmation for your records.", { size: 9, color: gray });
  draw("It is not a formal Israeli tax invoice (חשבונית מס).", { size: 9, color: gray });

  const bytes = await pdf.save();
  return new NextResponse(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="receipt-${subscription.id.slice(0, 10)}.pdf"`,
    },
  });
}
