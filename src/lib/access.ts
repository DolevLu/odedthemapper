import { prisma } from "@/lib/prisma";
import { PLANS } from "@/lib/plans";

/** Resolves the subscription that grants this user access — either one they
 * own directly, or one they were invited into as a seat (matched by email). */
async function getActiveSubscription(userId: string) {
  const owned = await prisma.subscription.findFirst({
    where: { userId, status: "active", currentPeriodEnd: { gt: new Date() } },
    include: { destinations: true },
    orderBy: { createdAt: "desc" },
  });
  if (owned) return owned;

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } });
  if (!user) return null;

  const membership = await prisma.subscriptionMember.findFirst({
    where: {
      invitedEmail: user.email,
      subscription: { status: "active", currentPeriodEnd: { gt: new Date() } },
    },
    include: { subscription: { include: { destinations: true } } },
    orderBy: { createdAt: "desc" },
  });
  return membership?.subscription ?? null;
}

export async function hasAccessToDestination(userId: string, destinationId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { isAdmin: true } });
  if (user?.isAdmin) return true; // admins can open any destination's app for QA without subscribing

  const sub = await getActiveSubscription(userId);
  if (!sub) return false;
  if (PLANS[sub.planKey as keyof typeof PLANS]?.isOrgTier) return true;
  return sub.destinations.some((d) => d.destinationId === destinationId);
}

export async function getUserPurchasedSlugs(userId: string): Promise<string[]> {
  const sub = await getActiveSubscription(userId);
  if (!sub) return [];
  if (PLANS[sub.planKey as keyof typeof PLANS]?.isOrgTier) {
    const all = await prisma.destination.findMany({ select: { slug: true } });
    return all.map((d) => d.slug);
  }
  const destinations = await prisma.destination.findMany({
    where: { id: { in: sub.destinations.map((d) => d.destinationId) } },
    select: { slug: true },
  });
  return destinations.map((d) => d.slug);
}

/** Org-tier subscribers get content-management rights equivalent to /admin, without being a global admin. */
export async function canManageContent(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { isAdmin: true } });
  if (user?.isAdmin) return true;
  const sub = await getActiveSubscription(userId);
  return Boolean(sub && PLANS[sub.planKey as keyof typeof PLANS]?.isOrgTier);
}

export type AccessLevel = "none" | "silver" | "gold";

/** silver = this destination is covered by an active subscription (or admin);
 * gold = org-tier active subscription (or admin) — unlocks the client-planner tool. */
export async function getAccessLevel(userId: string | undefined, destinationId: string): Promise<AccessLevel> {
  if (!userId) return "none";
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { isAdmin: true } });
  if (user?.isAdmin) return "gold";

  const sub = await getActiveSubscription(userId);
  if (!sub) return "none";
  if (PLANS[sub.planKey as keyof typeof PLANS]?.isOrgTier) return "gold";
  if (sub.destinations.some((d) => d.destinationId === destinationId)) return "silver";
  return "none";
}

/** Full subscription details for the account page: owned or via a seat
 * invite, with destination names and (for the owner) the seat list so they
 * can manage invites. */
export async function getResolvedSubscriptionForAccount(userId: string) {
  const owned = await prisma.subscription.findFirst({
    where: { userId, status: "active", currentPeriodEnd: { gt: new Date() } },
    include: { destinations: { include: { destination: true } }, members: true },
    orderBy: { createdAt: "desc" },
  });
  if (owned) return { subscription: owned, isOwner: true };

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } });
  if (!user) return null;

  const membership = await prisma.subscriptionMember.findFirst({
    where: {
      invitedEmail: user.email,
      subscription: { status: "active", currentPeriodEnd: { gt: new Date() } },
    },
    include: {
      subscription: { include: { destinations: { include: { destination: true } }, members: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  if (!membership) return null;
  return { subscription: membership.subscription, isOwner: false };
}

export async function getActiveSubscriptionSummary(userId: string) {
  const sub = await getActiveSubscription(userId);
  if (!sub) return null;
  const plan = PLANS[sub.planKey as keyof typeof PLANS];
  return {
    plan,
    billingCycle: sub.billingCycle,
    currentPeriodEnd: sub.currentPeriodEnd,
    destinationIds: sub.destinations.map((d) => d.destinationId),
  };
}
