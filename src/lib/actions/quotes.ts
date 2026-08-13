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

/** Lightweight "add a row" for the CRM table — just a client name, so a lead
 * can be logged the moment you hear about it. Pricing (basePrice etc.)
 * starts at 0 and is filled in later via updateLeadDetails, unlike
 * createPriceQuote's full form which requires a real price up front. */
export async function createQuickLead(destinationId: string, slug: string, clientName: string) {
  const userId = await requireUserId();
  const name = clientName.trim();
  if (!name) return;
  await prisma.priceQuote.create({
    data: { userId, destinationId, clientName: name, tripDays: 1, basePriceCents: 0, costCents: 0, includesBooking: false, bookingPriceCents: 0 },
  });
  revalidatePath(`/trip/${slug}/quotes`);
}

/** Inline spreadsheet-style edits from the CRM table — only the fields
 * actually changed are passed, each independently validated/clamped. */
export async function updateLeadDetails(
  id: string,
  slug: string,
  fields: { clientName?: string; tripDays?: number; basePrice?: number; costPrice?: number }
) {
  const userId = await requireUserId();
  const quote = await prisma.priceQuote.findUnique({ where: { id } });
  if (!quote || quote.userId !== userId) return;

  const data: Record<string, string | number> = {};
  if (fields.clientName !== undefined && fields.clientName.trim()) data.clientName = fields.clientName.trim();
  if (fields.tripDays !== undefined && Number.isFinite(fields.tripDays)) data.tripDays = Math.max(1, fields.tripDays);
  if (fields.basePrice !== undefined && Number.isFinite(fields.basePrice)) data.basePriceCents = Math.max(0, Math.round(fields.basePrice * 100));
  if (fields.costPrice !== undefined && Number.isFinite(fields.costPrice)) data.costCents = Math.max(0, Math.round(fields.costPrice * 100));
  if (Object.keys(data).length === 0) return;

  await prisma.priceQuote.update({ where: { id }, data });
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
