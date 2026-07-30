import { prisma } from "@/lib/prisma";
import { PLANS, formatIls, type PlanKey } from "@/lib/plans";

export default async function AdminSubscriptionsPage() {
  const subscriptions = await prisma.subscription.findMany({
    orderBy: { createdAt: "desc" },
    include: { user: true, destinations: { include: { destination: true } } },
  });

  const mrr = subscriptions
    .filter((s) => s.status === "active")
    .reduce((sum, s) => sum + (s.billingCycle === "monthly" ? s.amountCents : s.amountCents / 12), 0) / 100;

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="mb-2 text-2xl font-bold">מנויים</h1>
      <p className="mb-6 text-sm opacity-60">הכנסה חודשית משוערת (MRR): ${mrr.toFixed(0)}</p>

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
            </tr>
          </thead>
          <tbody>
            {subscriptions.map((s) => (
              <tr key={s.id} className="border-b border-black/5">
                <td className="p-3">{s.user.email}</td>
                <td className="p-3">{PLANS[s.planKey as PlanKey]?.name ?? s.planKey}</td>
                <td className="p-3">{s.billingCycle === "monthly" ? "חודשי" : "שנתי"}</td>
                <td className="p-3">
                  {PLANS[s.planKey as PlanKey]?.isOrgTier
                    ? "הכל"
                    : s.destinations.map((d) => d.destination.name).join(", ")}
                </td>
                <td className="p-3">
                  <span
                    className="rounded-full px-2 py-0.5 text-xs"
                    style={{ background: s.status === "active" ? "#dcfce7" : "#f3f4f6" }}
                  >
                    {s.status}
                  </span>
                </td>
                <td className="p-3">{formatIls(s.amountCents)}</td>
              </tr>
            ))}
            {subscriptions.length === 0 && (
              <tr>
                <td colSpan={6} className="p-6 text-center opacity-60">
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
