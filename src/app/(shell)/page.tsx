import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { resolveDefaultDestination } from "@/lib/access";
import { HomePageContent } from "@/components/HomePageContent";

export default async function Home() {
  // Paying users land straight on their destination's map instead of the
  // marketing homepage — they already picked a destination, this page has
  // nothing left to sell them. Anonymous visitors and logged-in users with
  // no active (silver/gold) access on their default destination still see
  // the homepage as normal, exactly like before. Same destination the
  // sidebar itself would show as "current" here (resolveDefaultDestination),
  // so this never sends anyone somewhere the sidebar disagrees with.
  //
  // The sidebar's own "דף הבית" link deliberately points at /home, NOT
  // here — a paying user clicking it would otherwise just get bounced
  // straight back to the map they're already on, with no way to ever reach
  // the real homepage again. /home renders the exact same HomePageContent
  // with no redirect check at all, as the actual escape hatch.
  const session = await auth();
  if (session?.user?.id) {
    const resolved = await resolveDefaultDestination(session.user.id);
    if (resolved && resolved.accessLevel !== "none") {
      redirect(`/trip/${resolved.slug}`);
    }
  }

  return <HomePageContent />;
}
