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
      includesBooking,
      bookingPriceCents: includesBooking ? Math.round(bookingPrice * 100) : 0,
      notes,
    },
  });
  revalidatePath(`/trip/${slug}/quotes`);
}

export async function deletePriceQuote(id: string, slug: string) {
  await prisma.priceQuote.delete({ where: { id } });
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

/** Public action — the client accepts the quote from the share page. This is
 * a lightweight in-app acknowledgement only, NOT a legally binding e-signature. */
export async function acceptPriceQuote(token: string) {
  const quote = await prisma.priceQuote.findUnique({ where: { shareToken: token } });
  if (!quote) throw new Error("הצעת המחיר לא נמצאה");
  await prisma.priceQuote.update({ where: { id: quote.id }, data: { status: "accepted", acceptedAt: new Date() } });
}
