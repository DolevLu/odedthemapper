import { HomePageContent } from "@/components/HomePageContent";

/** The real, always-reachable homepage — no redirect check, unlike "/"
 * (which sends paying users straight to their destination's map). This is
 * what the sidebar's "דף הבית" link actually points at, so it keeps working
 * for paying users instead of just bouncing them back to the map they're
 * already on. */
export default async function HomePage() {
  return <HomePageContent />;
}
