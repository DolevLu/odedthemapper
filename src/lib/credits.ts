import { prisma } from "@/lib/prisma";
import { levelForPoints } from "@/lib/gamification";
import { getUserTravelStats } from "@/lib/stats";

/** ₪10 per level gained — a real but modest incentive: leveling up alone
 * won't fund a subscription, but stacks into a meaningful discount for an
 * engaged user over the course of a month. */
export const CREDIT_PER_LEVEL_CENTS = 1000;

function currentMonthKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export type CreditStatus = { level: number; creditCents: number; monthKey: string };

/**
 * Awards subscription credit for real level-ups. levelForPoints() is a pure
 * function recomputed live off current stats on every page view, so to
 * grant credit exactly once per level (not re-award it on every view) this
 * compares the freshly computed level against the highest level ever
 * persisted on the user row, only crediting the difference. The balance
 * resets at the start of each new calendar month — credit earned during a
 * month is meant to discount that month's renewal; a fresh balance starts
 * accruing right after.
 */
export async function syncLevelCredits(userId: string): Promise<CreditStatus> {
  const [stats, user] = await Promise.all([
    getUserTravelStats(userId),
    prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { highestLevelReached: true, subscriptionCreditCents: true, creditsMonthKey: true },
    }),
  ]);
  const level = levelForPoints(stats.totalPoints).level;
  const monthKey = currentMonthKey();
  const isNewMonth = user.creditsMonthKey !== monthKey;

  let creditCents = isNewMonth ? 0 : user.subscriptionCreditCents;
  let highestLevelReached = user.highestLevelReached;

  if (level > highestLevelReached) {
    creditCents += (level - highestLevelReached) * CREDIT_PER_LEVEL_CENTS;
    highestLevelReached = level;
  }

  if (isNewMonth || level > user.highestLevelReached) {
    await prisma.user.update({
      where: { id: userId },
      data: { subscriptionCreditCents: creditCents, highestLevelReached, creditsMonthKey: monthKey },
    });
  }

  return { level, creditCents, monthKey };
}
