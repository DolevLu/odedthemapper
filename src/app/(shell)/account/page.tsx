import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getResolvedSubscriptionForAccount } from "@/lib/access";
import { PLANS, formatUsd, type PlanKey } from "@/lib/plans";
import { MemberManager } from "./MemberManager";
import { CancelSubscriptionButton } from "./CancelSubscriptionButton";

export default async function AccountPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?callbackUrl=/account");

  const resolved = await getResolvedSubscriptionForAccount(session.user.id);
  const active = resolved?.subscription;

  return (
    <div className="mx-auto w-full max-w-2xl flex-1 px-6 py-16">
      <h1 className="mb-6 text-2xl font-extrabold">המנוי שלי</h1>

      {active ? (
        <div className="rounded-3xl border border-black/5 bg-white p-6">
          <p className="text-sm font-semibold opacity-60">{PLANS[active.planKey as PlanKey].audience}</p>
          <h2 className="mt-1 text-xl font-extrabold">{PLANS[active.planKey as PlanKey].name}</h2>
          <p className="mt-2 text-sm opacity-70">
            {formatUsd(active.amountCents)} · {active.billingCycle === "monthly" ? "חודשי" : "שנתי"} ·{" "}
            {active.cancelAtPeriodEnd ? "מסתיים ב-" : "מתחדש ב-"}
            {active.currentPeriodEnd.toLocaleDateString("he-IL")}
          </p>
          {active.cancelAtPeriodEnd && (
            <p className="mt-1 text-sm font-semibold text-amber-600">
              המנוי בוטל ולא יחודש — הגישה תישאר פעילה עד תום התקופה הנוכחית.
            </p>
          )}
          {!resolved!.isOwner && <p className="mt-1 text-xs opacity-60">אתם מוזמנים למנוי הזה כמשתמש נוסף.</p>}

          {active.destinations.length > 0 && (
            <div className="mt-4 flex flex-col gap-2">
              <p className="text-sm font-semibold">היעדים שלכם:</p>
              <div className="flex flex-wrap gap-2">
                {active.destinations.map((d) => (
                  <Link
                    key={d.id}
                    href={`/trip/${d.destination.slug}`}
                    className="rounded-full bg-purple-50 px-3 py-1 text-sm font-medium text-purple-700"
                  >
                    {d.destination.name} ←
                  </Link>
                ))}
              </div>
            </div>
          )}
          {PLANS[active.planKey as PlanKey].isOrgTier && resolved!.isOwner && (
            <Link href="/admin" className="mt-4 inline-block text-sm font-semibold underline">
              מעבר לפאנל ניהול תוכן
            </Link>
          )}

          {resolved!.isOwner && PLANS[active.planKey as PlanKey].seats !== 1 && (
            <MemberManager
              subscriptionId={active.id}
              members={active.members.map((m) => ({ id: m.id, invitedEmail: m.invitedEmail }))}
              seats={PLANS[active.planKey as PlanKey].seats}
              ownerEmail={session.user.email ?? ""}
            />
          )}

          {resolved!.isOwner && !active.cancelAtPeriodEnd && (
            <CancelSubscriptionButton
              subscriptionId={active.id}
              periodEndLabel={active.currentPeriodEnd.toLocaleDateString("he-IL")}
            />
          )}
        </div>
      ) : (
        <div className="rounded-3xl border border-black/5 bg-white p-8 text-center">
          <p className="opacity-70">אין לכם מנוי פעיל כרגע.</p>
          <Link
            href="/pricing"
            className="mt-4 inline-block rounded-full px-6 py-3 font-semibold text-white"
            style={{ background: "linear-gradient(135deg, #7C3AED, #EC4899)" }}
          >
            בחרו תוכנית
          </Link>
        </div>
      )}
    </div>
  );
}
