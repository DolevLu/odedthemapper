import { auth } from "@/auth";
import { getUserPurchasedSlugs, pickDefaultDestinationSlug, getAccessLevel } from "@/lib/access";
import { getAllDestinations, getDestinationBySlug } from "@/lib/data/destinations";
import { SiteHeader } from "@/components/header/SiteHeader";
import { AppSidebar } from "@/components/AppSidebar";

export default async function ShellLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  let currentSlug: string | null = null;
  let accessLevel: "none" | "silver" | "gold" = "none";

  // Paying users get a real destination context even here (home/destinations/
  // account, outside any /trip/[slug] page) so the sidebar's categories show
  // as unlocked instead of demanding they pick a destination first — their
  // one purchased destination, or (family/org tier with several) a
  // deterministic pick among the ones they have access to. Excludes "draft"
  // destinations only — getUserPurchasedSlugs' org-tier branch returns every
  // destination regardless of status, and "draft" is the one status that
  // means no content/not purchasable yet (see DestinationCard's isComingSoon).
  if (session?.user?.id) {
    const [slugs, allDestinations] = await Promise.all([getUserPurchasedSlugs(session.user.id), getAllDestinations()]);
    const bookableSlugs = new Set(allDestinations.filter((d) => d.status !== "draft").map((d) => d.slug));
    const picked = pickDefaultDestinationSlug(session.user.id, slugs.filter((s) => bookableSlugs.has(s)));
    if (picked) {
      const destination = await getDestinationBySlug(picked);
      if (destination) {
        currentSlug = picked;
        accessLevel = await getAccessLevel(session.user.id, destination.id);
      }
    }
  }

  return (
    <div className="flex min-h-screen flex-1 flex-col">
      <SiteHeader />
      <div className="flex flex-1 flex-col sm:flex-row">
        <AppSidebar currentSlug={currentSlug} accessLevel={accessLevel} isLoggedIn={Boolean(session?.user?.id)} />
        <div className="min-w-0 flex-1 pb-32 sm:pb-0">{children}</div>
      </div>
    </div>
  );
}
