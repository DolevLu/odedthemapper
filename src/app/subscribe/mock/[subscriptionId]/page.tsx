import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { PLANS, formatIls, type PlanKey } from "@/lib/plans";
import { MockPayButton } from "./MockPayButton";

export default async function MockSubscribeCheckoutPage({
  params,
}: {
  params: Promise<{ subscriptionId: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { subscriptionId } = await params;
  const subscription = await prisma.subscription.findUnique({
    where: { id: subscriptionId },
    include: { destinations: { include: { destination: true } } },
  });

  if (!subscription || subscription.userId !== session.user.id) notFound();
  if (subscription.status === "active") redirect("/account");

  const plan = PLANS[subscription.planKey as PlanKey];
  const cycleLabel = subscription.billingCycle === "monthly" ? "לחודש" : "לשנה";

  return (
    <div className="flex flex-1 items-center justify-center p-6" style={{ background: "#FAF7FF" }}>
      <div className="w-full max-w-md rounded-3xl border border-black/5 bg-white p-8 text-center shadow-xl">
        <p className="text-sm font-medium opacity-60">מצב תשלום — הדגמה (Test Mode)</p>
        <h1 className="mt-2 text-2xl font-extrabold">מנוי {plan.name}</h1>
        <p className="mt-4 text-4xl font-extrabold" style={{ color: "#7C3AED" }}>
          {formatIls(subscription.amountCents)} <span className="text-lg font-medium opacity-60">{cycleLabel}</span>
        </p>

        {subscription.destinations.length > 0 && (
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            {subscription.destinations.map((d) => (
              <span key={d.id} className="rounded-full bg-purple-50 px-3 py-1 text-sm font-medium text-purple-700">
                {d.destination.name}
              </span>
            ))}
          </div>
        )}
        {plan.isOrgTier && (
          <p className="mt-5 text-sm opacity-70">גישה מלאה לכל היעדים + הרשאות ניהול תוכן</p>
        )}

        <p className="mt-4 text-xs opacity-50">
          זהו תשלום מדומה לצורך פיתוח — לא מתבצע חיוב אמיתי. בהמשך יוחלף בסליקה אמיתית דרך PayMe.
        </p>

        <MockPayButton subscriptionId={subscription.id} />
      </div>
    </div>
  );
}
