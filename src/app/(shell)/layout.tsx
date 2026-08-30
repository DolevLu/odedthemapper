import { auth } from "@/auth";
import { resolveDefaultDestination, getActiveSubscriptionSummary } from "@/lib/access";
import { AppSidebar } from "@/components/AppSidebar";

export default async function ShellLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  let currentSlug: string | null = null;
  let accessLevel: "none" | "silver" | "gold" = "none";

  // Paying users get a real destination context even here (home/destinations/
  // account, outside any /trip/[slug] page) so the sidebar's categories show
  // as unlocked instead of demanding they pick a destination first. Same
  // resolution the homepage uses to decide whether to redirect straight to
  // the map — see resolveDefaultDestination.
  if (session?.user?.id) {
    const resolved = await resolveDefaultDestination(session.user.id);
    if (resolved) {
      currentSlug = resolved.slug;
      accessLevel = resolved.accessLevel;
    }
  }

  const summary = session?.user?.id ? await getActiveSubscriptionSummary(session.user.id) : null;
  const planLabel = summary ? summary.plan.name : session?.user ? "חינמי" : null;

  return (
    <div className="flex min-h-screen flex-1 flex-col">
      <div className="flex flex-1 flex-col sm:flex-row">
        <AppSidebar
          currentSlug={currentSlug}
          accessLevel={accessLevel}
          isLoggedIn={Boolean(session?.user?.id)}
          name={session?.user?.name ?? null}
          planLabel={planLabel}
          isAdmin={session?.user?.isAdmin ?? false}
        />
        <div className="min-w-0 flex-1 pb-32 sm:pb-0">{children}</div>
      </div>
    </div>
  );
}
