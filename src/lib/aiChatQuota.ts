import { prisma } from "@/lib/prisma";

function jerusalemDateKey(d: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jerusalem" }).format(d);
}

/** Atomically counts this user's Travi AI chat messages against their plan's
 * daily quota, keyed to the Asia/Jerusalem calendar day (this app's whole
 * audience is Hebrew/Israeli) so it resets at local midnight rather than UTC
 * midnight. Gemini calls cost real money per message — this is checked
 * before ever calling it (see askTravi), not just displayed as a UI number. */
export async function consumeAiChatQuota(userId: string, dailyQuota: number): Promise<{ allowed: boolean; remaining: number }> {
  const date = jerusalemDateKey();
  const existing = await prisma.aiChatUsage.findUnique({ where: { userId_date: { userId, date } } });
  if (existing && existing.count >= dailyQuota) {
    return { allowed: false, remaining: 0 };
  }
  const updated = await prisma.aiChatUsage.upsert({
    where: { userId_date: { userId, date } },
    create: { userId, date, count: 1 },
    update: { count: { increment: 1 } },
  });
  return { allowed: true, remaining: Math.max(0, dailyQuota - updated.count) };
}
