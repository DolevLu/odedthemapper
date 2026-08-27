import { prisma } from "@/lib/prisma";

export type ResolvedPromo = { id: string; discount: number };

/** Looks up a checkout promo code (case/whitespace-insensitive) and returns
 * its discount fraction (e.g. 0.15 for 15% off) only if it's currently
 * usable — active, not expired, and under its max-uses cap. Returns null for
 * anything invalid, so callers can treat "no discount" and "bad code" the
 * same way without leaking which case it was. */
export async function resolvePromoCode(code: string | undefined | null): Promise<ResolvedPromo | null> {
  if (!code) return null;
  const trimmed = code.trim().toLowerCase();
  if (!trimmed) return null;

  const promo = await prisma.promoCode.findUnique({ where: { code: trimmed } });
  if (!promo || !promo.active) return null;
  if (promo.expiresAt && promo.expiresAt.getTime() < Date.now()) return null;
  if (promo.maxUses != null && promo.useCount >= promo.maxUses) return null;

  return { id: promo.id, discount: promo.discountPercent / 100 };
}

/** Records a redemption — called once a subscription actually gets created
 * with this code applied, not just on a live-preview lookup. */
export async function recordPromoCodeUse(promoId: string): Promise<void> {
  await prisma.promoCode.update({ where: { id: promoId }, data: { useCount: { increment: 1 } } });
}
