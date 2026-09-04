import { notFound } from "next/navigation";
import { after } from "next/server";
import { auth } from "@/auth";
import { getDestinationBySlug } from "@/lib/data/destinations";
import { getAccessLevel, getActiveSubscriptionSummary } from "@/lib/access";
import { tierBadgeForPlanKey } from "@/lib/plans";
import { AdSenseScript } from "@/components/AdSenseScript";
import { prisma } from "@/lib/prisma";
import { DestinationThemeProvider } from "@/components/theme/DestinationThemeProvider";
import { AppSidebar } from "@/components/AppSidebar";
import { TraviChat } from "@/components/travi/TraviChat";
import { WalkthroughGuide } from "@/components/WalkthroughGuide";
import { TripContentArea } from "@/components/TripContentArea";

export default async function TripLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [session, destination] = await Promise.all([auth(), getDestinationBySlug(slug)]);
  if (!destination) notFound();

  // Anonymous visitors can browse the shell too — free categories work fully,
  // the map renders a reduced/read-only preview, and everything else gates
  // itself per-screen (see AppSidebar + UpgradeRequired) rather than a hard
  // redirect away from the destination entirely.
  const accessLevel = await getAccessLevel(session?.user?.id, destination.id);
  const isLoggedIn = Boolean(session?.user?.id);

  // Remembers "the destination they chose" for the shell's default-context
  // fallback ((shell)/layout.tsx) — this layout only re-runs when the slug
  // itself changes (not on every screen switch within the same
  // destination), so this naturally fires once per real destination switch
  // rather than on every navigation. Deferred via after() rather than
  // awaited — it's pure bookkeeping for a future page load, not something
  // this render depends on, so it shouldn't hold up first paint. after()
  // (not a bare un-awaited promise) so the write reliably completes even
  // after the response is sent, instead of risking cancellation when the
  // serverless function's execution context ends.
  if (session?.user?.id) {
    const userId = session.user.id;
    after(() => prisma.user.update({ where: { id: userId }, data: { defaultDestinationSlug: slug } }).catch(() => {}));

    // Permanent "you were once here" record for the הטיולים שלי archive
    // (see DestinationAccess in schema.prisma) — created once per user per
    // destination the first time they land here with real access, and never
    // touched again after that (upsert's update is a no-op on repeat
    // visits). Deliberately NOT tied to the SubscriptionDestination row
    // itself, which DOES get removed on a 14-day swap — this is what lets
    // the archive keep showing a past trip forever, independent of current
    // subscription state.
    if (accessLevel !== "none") {
      const destinationId = destination.id;
      after(() =>
        prisma.destinationAccess
          .upsert({
            where: { userId_destinationId: { userId, destinationId } },
            update: {},
            create: { userId, destinationId },
          })
          .catch(() => {})
      );
    }
  }

  const summary = session?.user?.id ? await getActiveSubscriptionSummary(session.user.id) : null;
  const planLabel = summary ? summary.plan.name : session?.user ? "חינמי" : null;
  const tierBadge = tierBadgeForPlanKey(summary?.plan.key ?? null);
  const trialEndsAt = summary?.plan.key === "trial" ? summary.currentPeriodEnd.toISOString() : null;

  return (
    <DestinationThemeProvider theme={destination.theme} as="main" className="flex min-h-screen flex-1 flex-col">
      <div className="flex flex-1 flex-col sm:flex-row">
        <AppSidebar
          currentSlug={slug}
          accessLevel={accessLevel}
          isLoggedIn={isLoggedIn}
          name={session?.user?.name ?? null}
          planLabel={planLabel}
          tierBadge={tierBadge}
          trialEndsAt={trialEndsAt}
          isAdmin={session?.user?.isAdmin ?? false}
        />
        <TripContentArea slug={slug}>{children}</TripContentArea>
      </div>

      {accessLevel !== "none" && <TraviChat destinationId={destination.id} slug={slug} />}
      {accessLevel !== "none" && <WalkthroughGuide slug={slug} />}
      <AdSenseScript show={summary === null || summary.plan.key === "trial"} />
    </DestinationThemeProvider>
  );
}
