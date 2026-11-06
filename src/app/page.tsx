import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { resolveDefaultDestination } from "@/lib/access";
import { LandingPage } from "@/components/landing/LandingPage";

// The public landing page. Anyone who already owns a country goes straight into their map; everyone else sees
// destinations, prices and screenshots only - the platform itself opens after buying a country (see /buy/[slug]).
export default async function Home() {
  const session = await auth();
  if (session?.user?.id) {
    const resolved = await resolveDefaultDestination(session.user.id);
    if (resolved && resolved.accessLevel !== "none") redirect(`/trip/${resolved.slug}`);
  }
  return <LandingPage />;
}
