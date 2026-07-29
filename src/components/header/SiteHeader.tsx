import Link from "next/link";
import { auth } from "@/auth";
import { getActiveSubscriptionSummary } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { ProfileMenu } from "./ProfileMenu";
import { DestinationBadge } from "./DestinationBadge";
import { UpcomingReminderToast } from "@/components/UpcomingReminderToast";

export async function SiteHeader() {
  const session = await auth();
  const userId = session?.user?.id;
  const summary = userId ? await getActiveSubscriptionSummary(userId) : null;
  const planLabel = summary ? summary.plan.name : session?.user ? "חינמי" : null;
  const isOrgActive = summary?.plan.isOrgTier ?? false;

  const upcoming = userId
    ? await prisma.tripLogistic.findFirst({
        where: { userId, startsAt: { gte: new Date(), lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) } },
        orderBy: { startsAt: "asc" },
        include: { destination: { select: { slug: true } } },
      })
    : null;
  const reminderItem = upcoming
    ? {
        id: upcoming.id,
        type: upcoming.type,
        title: (JSON.parse(upcoming.detailsJson) as { title: string }).title,
        startsAt: upcoming.startsAt!.toISOString(),
        slug: upcoming.destination.slug,
      }
    : null;

  return (
    <header
      className="sticky top-0 z-30 px-6 py-3 backdrop-blur"
      style={{
        display: "grid",
        gridTemplateColumns: "1fr auto 1fr",
        alignItems: "center",
        background: "color-mix(in srgb, #FBF6EE 92%, transparent)",
        boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
      }}
    >
      <div className="flex items-center gap-2 justify-self-start">
        <ProfileMenu isLoggedIn={Boolean(session?.user)} name={session?.user?.name ?? null} planLabel={planLabel} />
        {!isOrgActive && (
          <Link
            href="/pricing"
            className="rounded-full px-4 py-1.5 text-sm font-bold text-white shadow-sm"
            style={{ background: "linear-gradient(135deg, #F59E0B, #EC4899)" }}
          >
            ✨ שדרג
          </Link>
        )}
      </div>

      <div className="justify-self-center text-center">
        <DestinationBadge />
      </div>

      <Link href="/" className="flex items-center gap-2.5 justify-self-end">
        <span className="text-lg font-extrabold">עודד המנקד</span>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-mark.svg" alt="עודד המנקד" className="h-9 w-9" />
      </Link>

      <UpcomingReminderToast item={reminderItem} />
    </header>
  );
}
