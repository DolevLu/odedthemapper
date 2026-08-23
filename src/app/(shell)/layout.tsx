import { auth } from "@/auth";
import { getUserPurchasedSlugs, pickDefaultDestinationSlug, getAccessLevel, getActiveSubscriptionSummary } from "@/lib/access";
import { getAllDestinations, getDestinationBySlug } from "@/lib/data/destinations";
import { prisma } from "@/lib/prisma";
import { AppSidebar } from "@/components/AppSidebar";

// This account's default is pinned to Prague regardless of last-visited
// destination or the random pick, per its owner's explicit request — every
// other user's default instead follows whichever destination they actually
// selected (see defaultDestinationSlug below).
const PINNED_DEFAULT_DESTINATION: Record<string, string> = {
  "rogerthemapper@gmail.com": "prague",
};

export default async function ShellLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  let currentSlug: string | null = null;
  let accessLevel: "none" | "silver" | "gold" = "none";

  // Paying users get a real destination context even here (home/destinations/
  // account, outside any /trip/[slug] page) so the sidebar's categories show
  // as unlocked instead of demanding they pick a destination first. Priority
  // order: (1) a hardcoded per-account pin, (2) the destination they most
  // recently actually browsed (User.defaultDestinationSlug, updated by
  // trip/[slug]/layout.tsx) — "the destination they chose" — (3) a
  // deterministic pick among the ones they have access to, for a first-time
  // visitor with no browsing history yet. Excludes "draft" destinations —
  // getUserPurchasedSlugs' org-tier branch returns every destination
  // regardless of status, and "draft" is the one status with no real content
  // yet (see DestinationCard's isComingSoon).
  if (session?.user?.id) {
    const [user, slugs, allDestinations] = await Promise.all([
      prisma.user.findUnique({ where: { id: session.user.id }, select: { email: true, defaultDestinationSlug: true } }),
      getUserPurchasedSlugs(session.user.id),
      getAllDestinations(),
    ]);
    const bookableSlugs = new Set(allDestinations.filter((d) => d.status !== "draft").map((d) => d.slug));
    const accessibleBookableSlugs = slugs.filter((s) => bookableSlugs.has(s));

    const pinned = user?.email ? PINNED_DEFAULT_DESTINATION[user.email] : undefined;
    const lastVisited = user?.defaultDestinationSlug;
    const picked =
      (pinned && bookableSlugs.has(pinned) ? pinned : null) ??
      (lastVisited && accessibleBookableSlugs.includes(lastVisited) ? lastVisited : null) ??
      pickDefaultDestinationSlug(session.user.id, accessibleBookableSlugs);

    if (picked) {
      const destination = await getDestinationBySlug(picked);
      if (destination) {
        currentSlug = picked;
        accessLevel = await getAccessLevel(session.user.id, destination.id);
      }
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
        />
        <div className="min-w-0 flex-1 pb-32 sm:pb-0">{children}</div>
      </div>
    </div>
  );
}
