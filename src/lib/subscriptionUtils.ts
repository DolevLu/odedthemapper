export const SWAP_COOLDOWN_DAYS = 14;

/** How many days remain before a given SubscriptionDestination can be
 * swapped again — 0 means it's swappable right now. */
export function daysUntilSwappable(assignedAt: Date): number {
  const elapsedMs = Date.now() - assignedAt.getTime();
  const remainingMs = SWAP_COOLDOWN_DAYS * 24 * 60 * 60 * 1000 - elapsedMs;
  return Math.max(0, Math.ceil(remainingMs / (24 * 60 * 60 * 1000)));
}
