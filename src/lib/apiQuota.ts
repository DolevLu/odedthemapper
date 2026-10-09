import { prisma } from "@/lib/prisma";

export function jerusalemDateKey(d: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jerusalem" }).format(d);
}

/** Daily per-user ceilings for every server-side call that costs the owner money. Generous for a real trip
 * (nobody legitimately plans that many), tight enough that a script or abusive account can't run up a bill.
 * Admins are exempt. */
export const API_DAILY_LIMITS = {
  /** Gemini: swipe-builder place suggestions + free-text itinerary intent parsing. */
  aiPlanning: 40,
  /** Google Geocoding / Places Details + Photo lookups made server-side on a user's behalf. */
  googleLookup: 60,
  /** Files written to our storage (album/pin/logistics photos, mirrored Google photos) — storage + bandwidth cost. */
  upload: 200,
  /** Reading a shared reel/video link (one outbound page fetch + one AI read each). */
  socialImport: 30,
} as const;

export type ApiQuotaKind = keyof typeof API_DAILY_LIMITS;

/** Atomically takes one unit of `kind` for this user today (Asia/Jerusalem day). A single INSERT … ON CONFLICT DO
 * UPDATE … WHERE count < limit statement, so concurrent requests can't race past the limit (the old
 * read-then-upsert pattern could). Returns false when the day's budget is spent. */
export async function consumeApiQuota(userId: string, kind: ApiQuotaKind): Promise<boolean> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { isAdmin: true } });
  if (user?.isAdmin) return true;
  const limit = API_DAILY_LIMITS[kind];
  const date = jerusalemDateKey();
  const rows = await prisma.$queryRaw<{ count: number }[]>`
    INSERT INTO "ApiUsage" ("id", "userId", "kind", "date", "count")
    VALUES (${crypto.randomUUID()}, ${userId}, ${kind}, ${date}, 1)
    ON CONFLICT ("userId", "kind", "date")
    DO UPDATE SET "count" = "ApiUsage"."count" + 1
    WHERE "ApiUsage"."count" < ${limit}
    RETURNING "count"`;
  return rows.length > 0;
}
