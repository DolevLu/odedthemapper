import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { PLANS, formatUsd, type PlanKey } from "@/lib/plans";
import { PayMeCheckoutForm } from "./PayMeCheckoutForm";

export default async function PayMeCheckoutPage({
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
      <div className="w-full max-w-md rounded-3xl border border-black/5 bg-white p-8 shadow-xl">
        <p className="text-center text-sm font-medium opacity-60">תשלום מאובטח דרך PayMe</p>
        <h1 className="mt-2 text-center text-2xl font-extrabold">מנוי {plan.name}</h1>
        <p className="mt-4 text-center text-4xl font-extrabold" style={{ color: "#7C3AED" }}>
          {formatUsd(subscription.amountCents)} <span className="text-lg font-medium opacity-60">{cycleLabel}</span>
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

        <PayMeCheckoutForm
          subscriptionId={subscription.id}
          amountCents={subscription.amountCents}
          currency={subscription.currency}
          planName={plan.name}
          payerEmail={session.user.email ?? ""}
          payerName={session.user.name ?? ""}
        />
      </div>
    </div>
  );
}
