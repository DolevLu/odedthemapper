"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { PLANS, type PlanKey } from "@/lib/plans";
import { daysUntilSwappable } from "@/lib/subscriptionUtils";

async function requireUserId() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("יש להתחבר");
  return session.user.id;
}

export async function inviteSubscriptionMember(subscriptionId: string, formData: FormData) {
  const userId = await requireUserId();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!email) return { error: "יש להזין אימייל" };

  const subscription = await prisma.subscription.findUnique({
    where: { id: subscriptionId },
    include: { members: true, user: true },
  });
  if (!subscription || subscription.userId !== userId) return { error: "מנוי לא נמצא" };

  const plan = PLANS[subscription.planKey as PlanKey];
  const seatsUsed = 1 + subscription.members.length; // owner counts as one seat
  if (plan.seats !== null && seatsUsed >= plan.seats) {
    return { error: `התוכנית הזו כוללת עד ${plan.seats} משתמשים` };
  }
  if (email === subscription.user.email.toLowerCase()) {
    return { error: "זהו כבר האימייל של בעל/ת המנוי" };
  }

  await prisma.subscriptionMember.upsert({
    where: { subscriptionId_invitedEmail: { subscriptionId, invitedEmail: email } },
    update: {},
    create: { subscriptionId, invitedEmail: email },
  });
  revalidatePath("/account");
  return { ok: true };
}

export async function cancelSubscription(subscriptionId: string) {
  const userId = await requireUserId();
  const subscription = await prisma.subscription.findUnique({ where: { id: subscriptionId } });
  if (!subscription || subscription.userId !== userId) return { error: "מנוי לא נמצא" };

  await prisma.subscription.update({ where: { id: subscriptionId }, data: { cancelAtPeriodEnd: true } });
  revalidatePath("/account");
  return { ok: true };
}

/** Swaps one destination on a Solo/Family subscription for another, once
 * every 14 days per slot — e.g. traded Italy for Austria after two weeks. */
export async function swapSubscriptionDestination(subscriptionId: string, oldDestinationId: string, newDestinationSlug: string) {
  const userId = await requireUserId();
  const subscription = await prisma.subscription.findUnique({
    where: { id: subscriptionId },
    include: { destinations: true },
  });
  if (!subscription || subscription.userId !== userId) return { error: "מנוי לא נמצא" };

  const slot = subscription.destinations.find((d) => d.destinationId === oldDestinationId);
  if (!slot) return { error: "היעד הזה לא נמצא במנוי שלכם" };

  const remainingDays = daysUntilSwappable(slot.assignedAt);
  if (remainingDays > 0) {
    return { error: `אפשר להחליף את היעד הזה שוב בעוד ${remainingDays} ימים` };
  }

  const newDestination = await prisma.destination.findUnique({ where: { slug: newDestinationSlug } });
  if (!newDestination) return { error: "יעד לא נמצא" };
  if (subscription.destinations.some((d) => d.destinationId === newDestination.id)) {
    return { error: "היעד הזה כבר במנוי שלכם" };
  }

  await prisma.$transaction([
    prisma.subscriptionDestination.delete({ where: { id: slot.id } }),
    prisma.subscriptionDestination.create({
      data: { subscriptionId, destinationId: newDestination.id },
    }),
  ]);
  revalidatePath("/account");
  return { ok: true };
}

export async function removeSubscriptionMember(memberId: string) {
  const userId = await requireUserId();
  const member = await prisma.subscriptionMember.findUnique({
    where: { id: memberId },
    include: { subscription: true },
  });
  if (!member || member.subscription.userId !== userId) return;
  await prisma.subscriptionMember.delete({ where: { id: memberId } });
  revalidatePath("/account");
}
