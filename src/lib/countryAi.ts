import { prisma } from "@/lib/prisma";
import { COUNTRY_AI_USES } from "@/lib/plans";
import { getActiveSubscription, getCountryDestinationIds } from "@/lib/access";
import { resolvePlan } from "@/lib/plans";

/** Takes ONE of the AI uses a bought country includes (COUNTRY_AI_USES in total, not per day) - one atomic
 * INSERT … ON CONFLICT … WHERE count < limit statement so parallel requests can't overshoot.
 * kind "aiCountry:<destinationId>", date "lifetime" reuse the existing ApiUsage table (no schema change). */
async function takeCountryUse(userId: string, destinationId: string): Promise<boolean> {
  const rows = await prisma.$queryRaw<{ count: number }[]>`
    INSERT INTO "ApiUsage" ("id", "userId", "kind", "date", "count")
    VALUES (${crypto.randomUUID()}, ${userId}, ${"aiCountry:" + destinationId}, ${"lifetime"}, 1)
    ON CONFLICT ("userId", "kind", "date")
    DO UPDATE SET "count" = "ApiUsage"."count" + 1
    WHERE "ApiUsage"."count" < ${COUNTRY_AI_USES}
    RETURNING "count"`;
  return rows.length > 0;
}

/** How many AI uses are left for a bought country (null = not a country-only user / unlimited). */
export async function countryAiRemaining(userId: string, destinationId: string): Promise<number | null> {
  if (!(await isCountryOnlyUser(userId))) return null;
  const row = await prisma.apiUsage.findUnique({
    where: { userId_kind_date: { userId, kind: "aiCountry:" + destinationId, date: "lifetime" } },
    select: { count: true },
  });
  return Math.max(0, COUNTRY_AI_USES - (row?.count ?? 0));
}

/** A user whose access comes ONLY from one-time country purchases (no admin, org, seat or legacy subscription):
 * their AI is capped at COUNTRY_AI_USES per country. Everyone else keeps their existing daily quota. */
export async function isCountryOnlyUser(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { isAdmin: true } });
  if (user?.isAdmin) return false;
  const sub = await getActiveSubscription(userId);
  if (sub && resolvePlan(sub.planKey).key !== "country") return false;
  return (await getCountryDestinationIds(userId)).length > 0;
}

/** Gate for every server-side AI call made for a country buyer. Returns:
 *  - "unmetered": caller isn't country-only; use the old quota logic;
 *  - "ok": one country AI use was taken;
 *  - "exhausted": the country's AI uses are all spent.
 * Pass destinationId when the call knows it; without it, the first bought country that still has a use left pays. */
export async function consumeCountryAiUse(userId: string, destinationId?: string): Promise<"unmetered" | "ok" | "exhausted"> {
  if (!(await isCountryOnlyUser(userId))) return "unmetered";
  const owned = await getCountryDestinationIds(userId);
  if (destinationId) {
    if (!owned.includes(destinationId)) return "exhausted";
    return (await takeCountryUse(userId, destinationId)) ? "ok" : "exhausted";
  }
  for (const id of owned) if (await takeCountryUse(userId, id)) return "ok";
  return "exhausted";
}
