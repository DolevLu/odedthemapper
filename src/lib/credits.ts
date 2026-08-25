import { levelForPoints, discountPctForLevel } from "@/lib/gamification";
import { getUserTravelStats } from "@/lib/stats";

export type CreditStatus = { level: number; discountPct: number };

/**
 * The subscription-renewal discount is a fixed percentage per level (see
 * discountPctForLevel) — recomputed live from the user's current level every
 * time this is called, not an accumulated balance. Since points only ever go
 * up, this can't decrease month to month, and it "renews" every month simply
 * by always reflecting whatever level the user is at right now — no stored
 * monthly snapshot needed.
 */
export async function syncLevelCredits(userId: string): Promise<CreditStatus> {
  const stats = await getUserTravelStats(userId);
  const level = levelForPoints(stats.totalPoints).level;
  return { level, discountPct: discountPctForLevel(level) };
}
