import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { FREE_WEEK_DAYS } from "@/lib/plans";

/** The visitor's network address, normalized so trivial variations don't count as different people. Behind Vercel the
 * first hop of x-forwarded-for is the real client. IPv6 users get a fresh address constantly within their /64, so only
 * that prefix is used. Returns null when the address can't be determined. */
export async function getClientIp(): Promise<string | null> {
  try {
    const h = await headers();
    const raw = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip")?.trim() || null;
    if (!raw) return process.env.NODE_ENV === "production" ? null : "dev-local";
    if (raw.includes(":") && !raw.includes(".")) {
      // IPv6 -> first four hextets (the /64)
      const parts = raw.split(":");
      if (raw.includes("::")) {
        const [head] = raw.split("::");
        const hs = head.split(":").filter(Boolean);
        while (hs.length < 4) hs.push("0");
        return "v6:" + hs.slice(0, 4).join(":");
      }
      return "v6:" + parts.slice(0, 4).join(":");
    }
    if (raw.startsWith("::ffff:")) return raw.slice(7);
    return raw;
  } catch {
    return process.env.NODE_ENV === "production" ? null : "dev-local";
  }
}

/** Starts this new account's free week — unless its network address already got one. Called once, right when the
 * account is created (email sign-up and Google sign-up alike). The TrialClaim row is unique per IP, so this holds
 * even when two sign-ups race, and across browsers/devices/emails on the same network. Never throws: a failure here
 * must not break sign-up, the account just starts without the free week. */
export async function grantFreeWeek(userId: string): Promise<Date | null> {
  try {
    const ip = await getClientIp();
    if (!ip) return null;
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { isAdmin: true, freeUntil: true } });
    if (!user || user.freeUntil) return user?.freeUntil ?? null;
    try {
      await prisma.trialClaim.create({ data: { ip, userId } });
    } catch {
      return null; // unique(ip) violated: this network already had its free week
    }
    const freeUntil = new Date(Date.now() + FREE_WEEK_DAYS * 24 * 60 * 60 * 1000);
    await prisma.user.update({ where: { id: userId }, data: { freeUntil } });
    return freeUntil;
  } catch (err) {
    console.error("grantFreeWeek failed:", err);
    return null;
  }
}
