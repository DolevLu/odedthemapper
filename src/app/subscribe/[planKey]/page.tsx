import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { PLANS, formatUsd, annualMonthlyEquivalent, type PlanKey } from "@/lib/plans";
import { DestinationPicker } from "./DestinationPicker";
import { OrgConfirmButton } from "./OrgConfirmButton";

export default async function SubscribePage({
  params,
  searchParams,
}: {
  params: Promise<{ planKey: string }>;
  searchParams: Promise<{ cycle?: string; dest?: string }>;
}) {
  const { planKey } = await params;
  const { cycle, dest } = await searchParams;
  if (!(planKey in PLANS)) notFound();

  const session = await auth();
  if (!session?.user?.id) redirect(`/login?callbackUrl=/subscribe/${planKey}${cycle ? `?cycle=${cycle}` : ""}`);

  const plan = PLANS[planKey as PlanKey];
  const billingCycle = cycle === "annual" ? "annual" : "monthly";
  const price = billingCycle === "monthly" ? plan.monthlyCents : annualMonthlyEquivalent(plan);

  const destinations = await prisma.destination.findMany({
    where: { status: { in: ["preview", "live"] } },
    orderBy: { name: "asc" },
    select: { id: true, slug: true, name: true, tagline: true },
  });
  const preselected = dest ? destinations.find((d) => d.slug === dest)?.id : undefined;

  return (
    <div className="flex flex-1 flex-col items-center px-6 py-16" style={{ background: "#FBF6EE" }}>
      <div className="w-full max-w-2xl rounded-3xl border border-black/5 bg-white p-8">
        <p className="text-sm font-semibold opacity-60">{plan.audience}</p>
        <h1 className="mt-1 text-3xl font-extrabold">{plan.name}</h1>
        <p className="mt-2 text-lg">
          <span className="font-extrabold">{formatUsd(price)}</span>
          <span className="opacity-60"> / חודש · {billingCycle === "monthly" ? "חיוב חודשי" : "חיוב שנתי"}</span>
        </p>

        <div className="mt-6 border-t border-black/5 pt-6">
          {plan.isOrgTier ? (
            <div className="flex flex-col gap-4">
              <p className="text-sm opacity-70">התוכנית הזו כוללת גישה לכל היעדים במערכת — אין צורך לבחור.</p>
              <OrgConfirmButton billingCycle={billingCycle} />
            </div>
          ) : (
            <DestinationPicker
              planKey={plan.key}
              billingCycle={billingCycle}
              limit={plan.destinationLimit ?? 1}
              destinations={destinations}
              preselectId={preselected}
            />
          )}
        </div>
      </div>
    </div>
  );
}
