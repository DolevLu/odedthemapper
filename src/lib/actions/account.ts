"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

/**
 * Permanently deletes the signed-in user's account and every row tied to
 * it — every user relation in the schema is onDelete: Cascade (favorites,
 * itineraries, expenses, logistics, album media, saved pins, subscriptions,
 * etc.), so a single prisma.user.delete cleanly removes it all with no
 * separate per-table cleanup needed. Safe to do without a separate
 * payment-processor cancellation call: billing here (PayMe) is one-time
 * charges only, not a recurring/tokenized subscription on their end, so
 * there's nothing external left to cancel.
 *
 * Requires typing the account's own email as a lightweight confirmation —
 * this is irreversible and wipes real trip data (itineraries, expenses,
 * photos), so a single click isn't enough friction for something this
 * destructive.
 */
export async function deleteMyAccount(confirmEmail: string): Promise<{ error?: string }> {
  const session = await auth();
  if (!session?.user?.id) return { error: "יש להתחבר" };

  const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { email: true } });
  if (!user) return { error: "משתמש לא נמצא" };

  if (confirmEmail.trim().toLowerCase() !== user.email.toLowerCase()) {
    return { error: "כתובת האימייל שהוזנה לא תואמת את כתובת האימייל של החשבון" };
  }

  await prisma.user.delete({ where: { id: session.user.id } });
  return {};
}
