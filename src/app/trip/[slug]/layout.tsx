import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { getDestinationBySlug } from "@/lib/data/destinations";
import { getAccessLevel, getActiveSubscriptionSummary } from "@/lib/access";
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
  // rather than on every navigation.
  if (session?.user?.id) {
    await prisma.user.update({ where: { id: session.user.id }, data: { defaultDestinationSlug: slug } }).catch(() => {});
  }

  const summary = session?.user?.id ? await getActiveSubscriptionSummary(session.user.id) : null;
  const planLabel = summary ? summary.plan.name : session?.user ? "חינמי" : null;

  return (
    <DestinationThemeProvider theme={destination.theme} as="main" className="flex min-h-screen flex-1 flex-col">
      <div className="flex flex-1 flex-col sm:flex-row">
        <AppSidebar
          currentSlug={slug}
          accessLevel={accessLevel}
          isLoggedIn={isLoggedIn}
          name={session?.user?.name ?? null}
          planLabel={planLabel}
          isAdmin={session?.user?.isAdmin ?? false}
        />
        <TripContentArea slug={slug}>{children}</TripContentArea>
      </div>

      {accessLevel !== "none" && <TraviChat destinationId={destination.id} slug={slug} />}
      {accessLevel !== "none" && <WalkthroughGuide slug={slug} />}
    </DestinationThemeProvider>
  );
}
