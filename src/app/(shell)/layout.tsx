import { auth } from "@/auth";
import { getResolvedSubscriptionForAccount, getAccessLevel } from "@/lib/access";
import { PLANS, type PlanKey } from "@/lib/plans";
import { SiteHeader } from "@/components/header/SiteHeader";
import { AppSidebar } from "@/components/AppSidebar";

export default async function ShellLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  let currentSlug: string | null = null;
  let accessLevel: "none" | "silver" | "gold" = "none";

  if (session?.user?.id) {
    const resolved = await getResolvedSubscriptionForAccount(session.user.id);
    const plan = resolved ? PLANS[resolved.subscription.planKey as PlanKey] : null;
    // Org tier isn't tied to one destination, so there's nothing meaningful
    // to pin the sidebar to outside of a specific /trip/[slug] page.
    const firstDestination = resolved && !plan?.isOrgTier ? resolved.subscription.destinations[0]?.destination : null;
    if (firstDestination) {
      currentSlug = firstDestination.slug;
      accessLevel = await getAccessLevel(session.user.id, firstDestination.id);
    }
  }

  return (
    <div className="flex min-h-screen flex-1 flex-col">
      <SiteHeader />
      <div className="flex flex-1 flex-col sm:flex-row">
        <AppSidebar currentSlug={currentSlug} accessLevel={accessLevel} />
        <div className="min-w-0 flex-1 pb-32 sm:pb-0">{children}</div>
      </div>
    </div>
  );
}
