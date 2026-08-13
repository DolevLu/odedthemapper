import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { paymentProvider } from "@/lib/payments";
import { PLANS, type PlanKey } from "@/lib/plans";
import { resolvePromoDiscount } from "@/lib/promoCodes";

const SubscribeSchema = z.object({
  planKey: z.enum(["solo", "family", "org"]),
  billingCycle: z.enum(["monthly", "annual"]),
  destinationIds: z.array(z.string()).default([]),
  promoCode: z.string().optional(),
});

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "יש להתחבר לפני רכישה" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = SubscribeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "בקשה לא תקינה" }, { status: 400 });
  }

  const { planKey, billingCycle, destinationIds, promoCode } = parsed.data;
  const plan = PLANS[planKey as PlanKey];

  if (!plan.isOrgTier) {
    if (destinationIds.length === 0) {
      return NextResponse.json({ error: "יש לבחור לפחות יעד אחד" }, { status: 400 });
    }
    if (plan.destinationLimit && destinationIds.length > plan.destinationLimit) {
      return NextResponse.json({ error: `התוכנית הזו כוללת עד ${plan.destinationLimit} יעדים` }, { status: 400 });
    }
  }

  const baseAmountCents = billingCycle === "monthly" ? plan.monthlyCents : plan.annualCents;
  const discount = resolvePromoDiscount(promoCode);
  const amountCents = discount > 0 ? Math.round(baseAmountCents * (1 - discount)) : baseAmountCents;
  const periodDays = billingCycle === "monthly" ? 30 : 365;
  const currentPeriodEnd = new Date(Date.now() + periodDays * 24 * 60 * 60 * 1000);

  const subscription = await prisma.subscription.create({
    data: {
      userId: session.user.id,
      planKey,
      billingCycle,
      status: "pending",
      paymentSessionId: `mock_${crypto.randomUUID()}`,
      amountCents,
      currency: "ILS",
      currentPeriodEnd,
      destinations: plan.isOrgTier
        ? undefined
        : { create: destinationIds.map((destinationId) => ({ destinationId })) },
    },
  });

  const checkoutUrl = await paymentProvider.createCheckoutUrl({
    subscriptionId: subscription.id,
    planName: plan.name,
    amountCents,
    currency: "ILS",
  });

  return NextResponse.json({ checkoutUrl });
}
