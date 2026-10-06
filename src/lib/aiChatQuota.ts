import { prisma } from "@/lib/prisma";
import { jerusalemDateKey } from "@/lib/apiQuota";

/** Atomically counts this user's Travi AI chat messages against their plan's
 * daily quota, keyed to the Asia/Jerusalem calendar day (this app's whole
 * audience is Hebrew/Israeli) so it resets at local midnight rather than UTC
 * midnight. Gemini calls cost real money per message — this is checked
 * before ever calling it (see askTravi), not just displayed as a UI number.
 * One INSERT … ON CONFLICT DO UPDATE … WHERE count < quota statement, so
 * parallel requests can't each pass a read-then-write check and overshoot. */
export async function consumeAiChatQuota(userId: string, dailyQuota: number): Promise<{ allowed: boolean; remaining: number }> {
  const date = jerusalemDateKey();
  const rows = await prisma.$queryRaw<{ count: number }[]>`
    INSERT INTO "AiChatUsage" ("id", "userId", "date", "count")
    VALUES (${crypto.randomUUID()}, ${userId}, ${date}, 1)
    ON CONFLICT ("userId", "date")
    DO UPDATE SET "count" = "AiChatUsage"."count" + 1
    WHERE "AiChatUsage"."count" < ${dailyQuota}
    RETURNING "count"`;
  if (rows.length === 0) return { allowed: false, remaining: 0 };
  return { allowed: true, remaining: Math.max(0, dailyQuota - rows[0].count) };
}
