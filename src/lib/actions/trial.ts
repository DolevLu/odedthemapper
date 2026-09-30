"use server";

import { randomUUID } from "crypto";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { TRIAL_PLAN } from "@/lib/plans";

// Never expires in practice — the permanent free tier (see startFreeAccess below) simply has no real end date, but
// Subscription.currentPeriodEnd is a required, non-null column, so this stands in for "forever."
const FAR_FUTURE = new Date("2099-01-01T00:00:00Z");

/** Real client IP behind Vercel's proxy — x-forwarded-for can carry a chain
 * of proxies, so only the first (closest to the actual visitor) hop is used. */
async function getClientIp(): Promise<string> {
  const forwardedFor = (await headers()).get("x-forwarded-for");
  return forwardedFor?.split(",")[0]?.trim() || "unknown";
}

/** Grants the self-serve 24h/1-destination free trial — a real, active
 * Subscription row (amountCents: 0, isTrial: true), same mechanism every
 * other access check already reads, so it just works everywhere (map,
 * itinerary, AI chat quota, ads gating, sidebar badge) with no per-feature
 * special-casing, and naturally stops granting access the moment
 * currentPeriodEnd passes — no separate "revoke" step needed.
 *
 * Blocked twice over so a user can't just make a second account (or sign in
 * from a different browser) to get another free 24h: once this exact userId
 * has ever had a planKey "trial" row (regardless of whether it's still
 * active), and once this exact IP has ever claimed one (via TrialClaim,
 * checked/created regardless of which account did it). "unknown" IP (should
 * be rare — Vercel always sets x-forwarded-for in production) is refused
 * outright rather than treated as an infinitely-reusable free pass. */
export async function startFreeTrial(destinationId: string): Promise<{ error: string } | { ok: true }> {
  const session = await auth();
  if (!session?.user?.id) return { error: "יש להתחבר כדי להתחיל ניסיון חינם" };
  const userId = session.user.id;

  const ip = await getClientIp();
  if (ip === "unknown") return { error: "לא הצלחנו לאמת את הבקשה - נסו שוב מאוחר יותר" };

  const [priorTrialByUser, priorClaimByIp] = await Promise.all([
    prisma.subscription.findFirst({ where: { userId, planKey: "trial" }, select: { id: true } }),
    prisma.trialClaim.findUnique({ where: { ip }, select: { id: true } }),
  ]);
  if (priorTrialByUser || priorClaimByIp) {
    return { error: "כבר נוצל ניסיון חינם עבור המשתמש או המכשיר הזה - אפשר לשדרג לתוכנית בתשלום כדי להמשיך" };
  }

  const currentPeriodEnd = new Date(Date.now() + TRIAL_PLAN.durationHours * 60 * 60 * 1000);

  await prisma.$transaction([
    prisma.subscription.create({
      data: {
        userId,
        planKey: "trial",
        billingCycle: "monthly",
        status: "active",
        paymentSessionId: `trial_${randomUUID()}`,
        amountCents: 0,
        currency: "ILS",
        currentPeriodEnd,
        paidAt: new Date(),
        isTrial: true,
        destinations: { create: [{ destinationId }] },
      },
    }),
    prisma.trialClaim.create({ data: { ip, userId } }),
  ]);

  // A subscription change affects access/ads/badges everywhere at once
  // (sidebar, every trip screen, pricing, home) — broad invalidation matches
  // the actual scope of what changed.
  revalidatePath("/", "layout");
  return { ok: true };
}

/** 2026-10-01 business-model change: every user gets free, permanent (no expiry) access to one destination by
 * default — this is what actually activates it the first time, same mechanism startFreeTrial above always used
 * (a real Subscription row), just planKey "free" instead of "trial" and no currentPeriodEnd that ever passes. No
 * IP/one-per-user anti-abuse check here (unlike the old trial) — there's nothing to abuse: everyone gets exactly
 * one free destination slot already, forever, so claiming it isn't a scarce resource.
 *
 * Only handles the FIRST activation. Changing which destination a user who already has free (or paid) access
 * already has is swapSubscriptionDestination's job (lib/actions/subscription.ts) — same 14-day-cooldown mechanism
 * solo/family always used, unchanged, since it already works on any Subscription regardless of planKey. */
export async function startFreeAccess(destinationId: string): Promise<{ error: string } | { ok: true }> {
  const session = await auth();
  if (!session?.user?.id) return { error: "יש להתחבר כדי לקבל גישה חינמית" };
  const userId = session.user.id;

  const existing = await prisma.subscription.findFirst({
    where: { userId, status: "active", currentPeriodEnd: { gt: new Date() } },
    include: { destinations: true },
  });
  if (existing) {
    if (existing.destinations.some((d) => d.destinationId === destinationId)) return { ok: true }; // already covered, nothing to do
    return { error: "כבר יש לכם גישה פעילה - כדי להחליף יעד אפשר לעשות זאת דרך הגדרות החשבון (עד פעם ב-14 יום)" };
  }

  await prisma.subscription.create({
    data: {
      userId,
      planKey: "free",
      billingCycle: "monthly",
      status: "active",
      paymentSessionId: `free_${randomUUID()}`,
      amountCents: 0,
      currency: "ILS",
      currentPeriodEnd: FAR_FUTURE,
      paidAt: new Date(),
      destinations: { create: [{ destinationId }] },
    },
  });

  revalidatePath("/", "layout");
  return { ok: true };
}
