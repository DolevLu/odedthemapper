"use server";

import crypto from "crypto";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { REFERRAL_REWARD_CENTS } from "@/lib/referralConstants";

function generateCode(): string {
  return crypto.randomBytes(4).toString("hex").toUpperCase();
}

export async function getOrCreateReferralCode(userId: string): Promise<string> {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { referralCode: true } });
  if (user.referralCode) return user.referralCode;

  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateCode();
    try {
      await prisma.user.update({ where: { id: userId }, data: { referralCode: code } });
      return code;
    } catch {
      // unique constraint collision (astronomically unlikely) — retry
    }
  }
  throw new Error("לא הצלחנו ליצור קוד הפניה");
}

async function resolveReferralCode(code: string): Promise<string | null> {
  const user = await prisma.user.findUnique({ where: { referralCode: code }, select: { id: true } });
  return user?.id ?? null;
}

/** Attributes a new user to whoever's referral code they signed up with —
 * only ever set once (never overwritten) and never to yourself. */
export async function claimReferralCode(userId: string, code: string) {
  const referrerId = await resolveReferralCode(code);
  if (!referrerId || referrerId === userId) return;

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { referredByUserId: true } });
  if (user?.referredByUserId) return;

  await prisma.user.update({ where: { id: userId }, data: { referredByUserId: referrerId } });
}

/** Client-callable wrapper — trusts the server session for the target user
 * rather than any client-supplied id, since this runs as a server action. */
export async function claimMyReferralCode(code: string) {
  const session = await auth();
  if (!session?.user?.id) return;
  await claimReferralCode(session.user.id, code.trim().toUpperCase());
}

/** Called once a user's FIRST subscription actually goes active — grants
 * both sides a one-time credit via the existing subscription-credit balance
 * (see lib/credits.ts), guarded by referralRewardedAt so it can never fire
 * twice even if triggered from more than one activation path (PayMe charge
 * vs. the mock/dev completion route). */
export async function awardReferralCreditIfEligible(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { referredByUserId: true, referralRewardedAt: true },
  });
  if (!user?.referredByUserId || user.referralRewardedAt) return;

  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: { subscriptionCreditCents: { increment: REFERRAL_REWARD_CENTS }, referralRewardedAt: new Date() },
    }),
    prisma.user.update({
      where: { id: user.referredByUserId },
      data: { subscriptionCreditCents: { increment: REFERRAL_REWARD_CENTS } },
    }),
  ]);
}

export async function getReferralStats(userId: string): Promise<{ code: string; referredCount: number }> {
  const [code, referredCount] = await Promise.all([
    getOrCreateReferralCode(userId),
    prisma.user.count({ where: { referredByUserId: userId, referralRewardedAt: { not: null } } }),
  ]);
  return { code, referredCount };
}
