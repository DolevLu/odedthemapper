import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { awardReferralCreditIfEligible } from "@/lib/referral";

export async function POST(_request: Request, { params }: { params: Promise<{ subscriptionId: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "יש להתחבר" }, { status: 401 });
  }

  const { subscriptionId } = await params;
  const subscription = await prisma.subscription.findUnique({ where: { id: subscriptionId } });

  if (!subscription || subscription.userId !== session.user.id) {
    return NextResponse.json({ error: "מנוי לא נמצא" }, { status: 404 });
  }

  await prisma.subscription.update({ where: { id: subscription.id }, data: { status: "active" } });
  await awardReferralCreditIfEligible(subscription.userId);

  return NextResponse.json({ ok: true });
}
