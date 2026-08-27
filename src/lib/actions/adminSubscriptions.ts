"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { canManageContent } from "@/lib/access";
import { PLANS, type PlanKey } from "@/lib/plans";

async function requireContentManager() {
  const session = await auth();
  if (!session?.user?.id || !(await canManageContent(session.user.id))) {
    throw new Error("אין הרשאה לניהול תוכן");
  }
}

/** Admin's manual "pamper a customer" / fix-a-broken-access flow — creates a
 * real, active Subscription row (amountCents: 0, grantedByAdmin: true) for
 * an EXISTING registered user, found by email. Deliberately requires the
 * user to already have a User row (i.e. have signed up at least once) rather
 * than creating one blind, since a bare pre-created row wouldn't reliably
 * link to their real Google/credentials sign-in later. */
export async function grantComplimentarySubscription(formData: FormData): Promise<{ error?: string }> {
  await requireContentManager();

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const planKey = String(formData.get("planKey") ?? "") as PlanKey;
  const destinationIds = formData.getAll("destinationIds").map(String);
  const months = Number(formData.get("months") ?? 1);

  if (!email) return { error: "יש להזין אימייל" };
  const plan = PLANS[planKey];
  if (!plan) return { error: "תוכנית לא תקינה" };
  if (!plan.isOrgTier && destinationIds.length === 0) return { error: "יש לבחור לפחות יעד אחד" };
  if (!Number.isFinite(months) || months < 1) return { error: "מספר חודשים לא תקין" };

  const user = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (!user) return { error: `לא נמצא משתמש רשום עם האימייל "${email}" - על המשתמש להירשם קודם (עם Google או אימייל+סיסמה), ואז אפשר להעניק גישה.` };

  const currentPeriodEnd = new Date(Date.now() + months * 30 * 24 * 60 * 60 * 1000);

  await prisma.subscription.create({
    data: {
      userId: user.id,
      planKey,
      billingCycle: "monthly",
      status: "active",
      paymentSessionId: `comp_${crypto.randomUUID()}`,
      amountCents: 0,
      currency: "ILS",
      currentPeriodEnd,
      paidAt: new Date(),
      grantedByAdmin: true,
      destinations: plan.isOrgTier ? undefined : { create: destinationIds.map((destinationId) => ({ destinationId })) },
    },
  });

  revalidatePath("/admin/subscriptions");
  return {};
}

/** Adds or removes a single destination on an existing (non-org) subscription
 * — the granular grant/revoke the admin asked for, without having to delete
 * and recreate the whole subscription just to fix one destination. */
export async function toggleSubscriptionDestination(subscriptionId: string, destinationId: string, grant: boolean) {
  await requireContentManager();
  if (grant) {
    await prisma.subscriptionDestination.upsert({
      where: { subscriptionId_destinationId: { subscriptionId, destinationId } },
      update: {},
      create: { subscriptionId, destinationId },
    });
  } else {
    await prisma.subscriptionDestination.deleteMany({ where: { subscriptionId, destinationId } });
  }
  revalidatePath("/admin/subscriptions");
}

export async function updateSubscriptionStatus(subscriptionId: string, status: "active" | "canceled" | "pending") {
  await requireContentManager();
  await prisma.subscription.update({ where: { id: subscriptionId }, data: { status } });
  revalidatePath("/admin/subscriptions");
}

export async function extendSubscriptionPeriod(subscriptionId: string, currentPeriodEndIso: string) {
  await requireContentManager();
  const currentPeriodEnd = new Date(currentPeriodEndIso);
  if (Number.isNaN(currentPeriodEnd.getTime())) return;
  await prisma.subscription.update({ where: { id: subscriptionId }, data: { currentPeriodEnd } });
  revalidatePath("/admin/subscriptions");
}

/** Removes access entirely — deletes the Subscription row (cascades its
 * destination/member rows). Used for "לגמרי להסיר" per the admin's request. */
export async function deleteSubscription(subscriptionId: string) {
  await requireContentManager();
  await prisma.subscription.delete({ where: { id: subscriptionId } });
  revalidatePath("/admin/subscriptions");
}
