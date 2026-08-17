import { prisma } from "@/lib/prisma";

export type SettleUpEntry = { userId: string; name: string; netCents: number }; // positive = they owe the caller

/** Nets out every shared expense between this user and the rest of their
 * group for one destination — one row per other member, positive meaning
 * they owe the caller money, negative meaning the caller owes them.
 * Deliberately simple pairwise netting (not minimal-transaction Splitwise
 * optimization) since a travel-companion group is small (≤5 seats). */
export async function getSettleUpSummary(userId: string, destinationId: string): Promise<SettleUpEntry[]> {
  const [myExpensesWithSplits, splitsOnOthersExpenses] = await Promise.all([
    prisma.expense.findMany({
      where: { userId, destinationId, splits: { some: {} } },
      include: { splits: { include: { user: { select: { id: true, name: true, email: true } } } } },
    }),
    prisma.expenseSplit.findMany({
      where: { userId, expense: { destinationId, userId: { not: userId } } },
      include: { expense: { include: { user: { select: { id: true, name: true, email: true } } } } },
    }),
  ]);

  const net = new Map<string, { name: string; netCents: number }>();
  function bump(id: string, name: string, deltaCents: number) {
    const cur = net.get(id) ?? { name, netCents: 0 };
    cur.netCents += deltaCents;
    net.set(id, cur);
  }

  for (const expense of myExpensesWithSplits) {
    for (const split of expense.splits) {
      bump(split.user.id, split.user.name ?? split.user.email, split.shareCents);
    }
  }
  for (const split of splitsOnOthersExpenses) {
    bump(split.expense.user.id, split.expense.user.name ?? split.expense.user.email, -split.shareCents);
  }

  return Array.from(net.entries())
    .map(([id, v]) => ({ userId: id, name: v.name, netCents: v.netCents }))
    .filter((e) => e.netCents !== 0);
}
