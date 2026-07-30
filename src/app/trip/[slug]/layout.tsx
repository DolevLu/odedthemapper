import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { getDestinationBySlug } from "@/lib/data/destinations";
import { getAccessLevel } from "@/lib/access";
import { DestinationThemeProvider } from "@/components/theme/DestinationThemeProvider";
import { SiteHeader } from "@/components/header/SiteHeader";
import { AppSidebar } from "@/components/AppSidebar";
import { TraviChat } from "@/components/travi/TraviChat";

export default async function TripLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [session, destination] = await Promise.all([auth(), getDestinationBySlug(slug)]);
  if (!session?.user?.id) redirect(`/login?callbackUrl=/trip/${slug}`);
  if (!destination) notFound();

  // Free users can now browse the whole app shell — individual screens gate
  // themselves by tier (see AppSidebar + UpgradeRequired) instead of a hard
  // redirect away from the destination entirely.
  const accessLevel = await getAccessLevel(session.user.id, destination.id);

  return (
    <DestinationThemeProvider theme={destination.theme} as="main" className="flex min-h-screen flex-1 flex-col">
      <SiteHeader />

      <div className="flex flex-1 flex-col sm:flex-row">
        <AppSidebar currentSlug={slug} accessLevel={accessLevel} />
        <div className="min-w-0 flex-1 p-6 pb-32 sm:pb-6">{children}</div>
      </div>

      {accessLevel !== "none" && <TraviChat destinationId={destination.id} slug={slug} />}
    </DestinationThemeProvider>
  );
}
