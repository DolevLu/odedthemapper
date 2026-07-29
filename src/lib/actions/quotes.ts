"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

async function requireUserId() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("יש להתחבר");
  return session.user.id;
}

export async function createPriceQuote(destinationId: string, slug: string, formData: FormData) {
  const userId = await requireUserId();
  const clientName = String(formData.get("clientName") ?? "").trim();
  const tripDays = Math.max(1, Number(formData.get("tripDays") ?? 1));
  const basePrice = Number(formData.get("basePrice") ?? 0);
  const costPrice = Number(formData.get("costPrice") ?? 0);
  const includesBooking = formData.get("includesBooking") === "on";
  const bookingPrice = Number(formData.get("bookingPrice") ?? 0);
  const notes = String(formData.get("notes") ?? "").trim() || null;

  if (!clientName || !Number.isFinite(basePrice) || basePrice <= 0) return;

  await prisma.priceQuote.create({
    data: {
      userId,
      destinationId,
      clientName,
      tripDays,
      basePriceCents: Math.round(basePrice * 100),
      costCents: Number.isFinite(costPrice) ? Math.round(costPrice * 100) : 0,
      includesBooking,
      bookingPriceCents: includesBooking ? Math.round(bookingPrice * 100) : 0,
      notes,
    },
  });
  revalidatePath(`/trip/${slug}/quotes`);
}

export async function deletePriceQuote(id: string, slug: string) {
  const userId = await requireUserId();
  const quote = await prisma.priceQuote.findUnique({ where: { id } });
  if (!quote || quote.userId !== userId) return;
  await prisma.priceQuote.delete({ where: { id } });
  revalidatePath(`/trip/${slug}/quotes`);
}

const LEAD_STATUSES = ["lead", "quoted", "planning", "closed_won", "closed_lost"] as const;

/** CRM pipeline stage — separate from `status` (draft/sent/accepted), which
 * tracks the quote document itself. */
export async function updateLeadStatus(id: string, slug: string, leadStatus: string) {
  const userId = await requireUserId();
  const quote = await prisma.priceQuote.findUnique({ where: { id } });
  if (!quote || quote.userId !== userId) return;
  if (!LEAD_STATUSES.includes(leadStatus as (typeof LEAD_STATUSES)[number])) return;
  await prisma.priceQuote.update({ where: { id }, data: { leadStatus } });
  revalidatePath(`/trip/${slug}/quotes`);
}

/** Generates (if needed) a share link and marks the quote as sent to the client. */
export async function sendPriceQuote(id: string, slug: string) {
  const quote = await prisma.priceQuote.findUniqueOrThrow({ where: { id } });
  await prisma.priceQuote.update({
    where: { id },
    data: {
      shareToken: quote.shareToken ?? crypto.randomUUID(),
      status: quote.status === "draft" ? "sent" : quote.status,
    },
  });
  revalidatePath(`/trip/${slug}/quotes`);
}

/** Public action — the client accepts the quote from the share page and
 * captures a real drawn signature (data URL from a canvas pad). This is a
 * genuine captured signature + timestamp record, but NOT routed through a
 * certified legal e-signature provider (e.g. DocuSign) — not legally binding. */
export async function acceptPriceQuote(token: string, signatureDataUrl: string) {
  const quote = await prisma.priceQuote.findUnique({ where: { shareToken: token } });
  if (!quote) throw new Error("הצעת המחיר לא נמצאה");
  await prisma.priceQuote.update({
    where: { id: quote.id },
    data: { status: "accepted", acceptedAt: new Date(), signatureDataUrl, signedAt: new Date() },
  });
}
