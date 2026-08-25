import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getResolvedSubscriptionForAccount } from "@/lib/access";
import { PLANS, formatIls, type PlanKey } from "@/lib/plans";
import { daysUntilSwappable } from "@/lib/subscriptionUtils";
import { getUserTravelStats } from "@/lib/stats";
import { levelForPoints } from "@/lib/gamification";
import { getVisitedCountryCodes, getCountryPhotos } from "@/lib/actions/visitedCountries";
import { syncLevelCredits } from "@/lib/credits";
import { getReferralStats } from "@/lib/referral";
import { REFERRAL_REWARD_CENTS } from "@/lib/referralConstants";
import { getFinishedTrips, getTripWrappedStats } from "@/lib/tripWrapped";
import { TripWrappedSection } from "./TripWrappedSection";
import { VisitedCountriesMap } from "@/components/VisitedCountriesMap";
import { MemberManager } from "./MemberManager";
import { CancelSubscriptionButton } from "./CancelSubscriptionButton";
import { SwapDestinationButton } from "./SwapDestinationButton";
import { LevelCard } from "./LevelCard";
import { ReferralCard } from "./ReferralCard";
import { NotificationOptIn } from "./NotificationOptIn";

export default async function AccountPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?callbackUrl=/account");

  const resolved = await getResolvedSubscriptionForAccount(session.user.id);
  const active = resolved?.subscription;
  const plan = active ? PLANS[active.planKey as PlanKey] : null;

  const allDestinations =
    active && !plan?.isOrgTier
      ? await prisma.destination.findMany({
          where: { status: { in: ["preview", "live"] } },
          select: { slug: true, name: true },
          orderBy: { name: "asc" },
        })
      : [];

  const [stats, visitedCodes, photosByCountry, credits, referral, finishedTrips] = await Promise.all([
    getUserTravelStats(session.user.id),
    getVisitedCountryCodes(session.user.id),
    getCountryPhotos(session.user.id),
    syncLevelCredits(session.user.id),
    getReferralStats(session.user.id),
    getFinishedTrips(session.user.id),
  ]);
  const wrappedTrips = await Promise.all(
    finishedTrips.map(async (t) => ({
      destinationId: t.destinationId,
      destinationName: t.destinationName,
      flag: t.flag,
      stats: await getTripWrappedStats(session.user.id, t.destinationId),
    }))
  );
  const level = levelForPoints(stats.totalPoints);
  const STAT_CARDS = [
    { label: "מדינות", value: stats.countriesVisited, icon: "🌍" },
    { label: "מסמכים שמורים", value: stats.documentsCount, icon: "📄" },
    { label: "מסלולים שיצרתי", value: stats.itinerariesCount, icon: "📅" },
    { label: "חידונים", value: stats.quizzesTaken, icon: "🧠" },
    { label: "ימים איתנו", value: stats.daysSinceJoined, icon: "⏱️" },
    { label: "נקודות", value: stats.totalPoints, icon: "⭐" },
  ];

  return (
    <div className="mx-auto w-full max-w-2xl flex-1 px-6 py-16">
      <h1 className="mb-4 text-2xl font-extrabold">הפרופיל שלי</h1>

      <LevelCard level={level} totalPoints={stats.totalPoints} discountPct={credits.discountPct} />

      <NotificationOptIn />

      <ReferralCard code={referral.code} referredCount={referral.referredCount} rewardIls={REFERRAL_REWARD_CENTS / 100} />

      <TripWrappedSection trips={wrappedTrips} />

      <div className="mb-8 grid grid-cols-3 gap-3">
        {STAT_CARDS.map((s) => (
          <div key={s.label} className="rounded-2xl border border-black/5 bg-white p-4 text-center">
            <div className="text-xl">{s.icon}</div>
            <div className="mt-1 text-lg font-extrabold">{s.value}</div>
            <div className="text-xs opacity-60">{s.label}</div>
          </div>
        ))}
      </div>
      {stats.bestQuizAveragePct !== null && (
        <p className="mb-8 -mt-4 text-sm opacity-60">ממוצע הצלחה בחידונים: {stats.bestQuizAveragePct}%</p>
      )}

      <div className="mb-8">
        <VisitedCountriesMap initialVisited={visitedCodes} photosByCountry={photosByCountry} />
      </div>

      <h2 className="mb-6 text-2xl font-extrabold">המנוי שלי</h2>

      {active ? (
        <div className="rounded-3xl border border-black/5 bg-white p-6">
          <p className="text-sm font-semibold opacity-60">{PLANS[active.planKey as PlanKey].audience}</p>
          <h2 className="mt-1 text-xl font-extrabold">{PLANS[active.planKey as PlanKey].name}</h2>
          <p className="mt-2 text-sm opacity-70">
            {formatIls(active.amountCents)} · {active.billingCycle === "monthly" ? "חודשי" : "שנתי"} ·{" "}
            {active.cancelAtPeriodEnd ? "מסתיים ב-" : "מתחדש ב-"}
            {active.currentPeriodEnd.toLocaleDateString("he-IL")}
          </p>
          {active.cancelAtPeriodEnd && (
            <p className="mt-1 text-sm font-semibold text-amber-600">
              המנוי בוטל ולא יחודש — הגישה תישאר פעילה עד תום התקופה הנוכחית.
            </p>
          )}
          {!resolved!.isOwner && <p className="mt-1 text-xs opacity-60">אתם מוזמנים למנוי הזה כמשתמש נוסף.</p>}

          {plan?.isOrgTier ? (
            <div className="mt-4">
              <p className="text-sm font-semibold">🌍 גישה מלאה לכל היעדים במערכת — ללא הגבלה</p>
              <Link href="/destinations" className="mt-1 inline-block text-sm font-medium underline" style={{ color: "var(--primary)" }}>
                עיון בכל היעדים ←
              </Link>
            </div>
          ) : (
            active.destinations.length > 0 && (
              <div className="mt-4 flex flex-col gap-2">
                <p className="text-sm font-semibold">היעדים שלכם:</p>
                <div className="flex flex-col gap-2">
                  {active.destinations.map((d) => (
                    <div key={d.id} className="flex flex-wrap items-center gap-2">
                      <Link
                        href={`/trip/${d.destination.slug}`}
                        className="rounded-full bg-purple-50 px-3 py-1 text-sm font-medium text-purple-700"
                      >
                        {d.destination.name} ←
                      </Link>
                      {resolved!.isOwner && (
                        <SwapDestinationButton
                          subscriptionId={active.id}
                          destinationId={d.destinationId}
                          destinationName={d.destination.name}
                          remainingDays={daysUntilSwappable(d.assignedAt)}
                          candidates={allDestinations.filter(
                            (c) => !active.destinations.some((ad) => ad.destination.slug === c.slug)
                          )}
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )
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

      <Link href="/delete-account" className="mt-8 block text-center text-xs opacity-40 hover:opacity-70">
        מחיקת החשבון שלי
      </Link>
    </div>
  );
}
