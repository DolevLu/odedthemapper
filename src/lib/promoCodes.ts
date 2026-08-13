/** Marketing promo codes redeemable at checkout — flat percentage off the
 * subscription price. Kept as a small static map rather than a DB table
 * since these are hand-picked campaign codes, not something admins issue
 * per-customer. */
export const PROMO_CODES: Record<string, number> = {
  travi15: 0.15,
};

export function resolvePromoDiscount(code: string | undefined | null): number {
  if (!code) return 0;
  return PROMO_CODES[code.trim().toLowerCase()] ?? 0;
}
