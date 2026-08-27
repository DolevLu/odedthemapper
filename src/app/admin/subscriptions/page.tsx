import { prisma } from "@/lib/prisma";
import { PLANS, formatIls, type PlanKey } from "@/lib/plans";
import { GrantAccessForm } from "./GrantAccessForm";
import { SubscriptionManagePanel } from "./SubscriptionManagePanel";

export default async function AdminSubscriptionsPage() {
  const [subscriptions, destinations] = await Promise.all([
    prisma.subscription.findMany({
      orderBy: { createdAt: "desc" },
      include: { user: true, destinations: { include: { destination: true } } },
    }),
    prisma.destination.findMany({ where: { status: { in: ["preview", "live"] } }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

  const mrr = subscriptions
    .filter((s) => s.status === "active")
    .reduce((sum, s) => sum + (s.billingCycle === "monthly" ? s.amountCents : s.amountCents / 12), 0) / 100;

  return (
    <div className="mx-auto max-w-6xl">
      <h1 className="mb-2 text-2xl font-bold">מנויים</h1>
      <p className="mb-6 text-sm opacity-60">הכנסה חודשית משוערת (MRR): ₪{mrr.toFixed(0)}</p>

      <GrantAccessForm destinations={destinations} />

      <div className="overflow-hidden rounded-xl border border-black/10 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-black/10 bg-black/5">
              <th className="p-3 text-start">משתמש</th>
              <th className="p-3 text-start">תוכנית</th>
              <th className="p-3 text-start">מחזור</th>
              <th className="p-3 text-start">יעדים</th>
              <th className="p-3 text-start">סטטוס</th>
              <th className="p-3 text-start">סכום</th>
              <th className="p-3" />
            </tr>
          </thead>
          <tbody>
            {subscriptions.map((s) => {
              const plan = PLANS[s.planKey as PlanKey];
              return (
                <tr key={s.id} className="border-b border-black/5 align-top">
                  <td className="p-3">
                    {s.user.email}
                    {s.grantedByAdmin && <span className="ms-1.5 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700">מתנה</span>}
                  </td>
                  <td className="p-3">{plan?.name ?? s.planKey}</td>
                  <td className="p-3">{s.billingCycle === "monthly" ? "חודשי" : "שנתי"}</td>
                  <td className="p-3">{plan?.isOrgTier ? "הכל" : s.destinations.map((d) => d.destination.name).join(", ") || "—"}</td>
                  <td className="p-3">
                    <span className="rounded-full px-2 py-0.5 text-xs" style={{ background: s.status === "active" ? "#dcfce7" : "#f3f4f6" }}>
                      {s.status}
                    </span>
                  </td>
                  <td className="p-3">{formatIls(s.amountCents)}</td>
                  <td className="p-3">
                    <a href={`/api/receipts/${s.id}`} className="mb-1.5 block text-xs font-medium underline opacity-70 hover:opacity-100">
                      🧾 קבלה
                    </a>
                    <SubscriptionManagePanel
                      subscriptionId={s.id}
                      isOrgTier={Boolean(plan?.isOrgTier)}
                      status={s.status}
                      currentPeriodEnd={s.currentPeriodEnd.toISOString().slice(0, 10)}
                      currentDestinationIds={s.destinations.map((d) => d.destinationId)}
                      allDestinations={destinations}
                    />
                  </td>
                </tr>
              );
            })}
            {subscriptions.length === 0 && (
              <tr>
                <td colSpan={7} className="p-6 text-center opacity-60">
                  אין עדיין מנויים.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
