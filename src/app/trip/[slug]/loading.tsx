import { LoadingTraveler } from "@/components/LoadingTraveler";

// Next.js wraps this segment's page in a Suspense boundary keyed to this
// file — shown immediately on navigation between any of the destination
// screens (now/map/itinerary/favorites/...), while the sidebar itself
// stays put, so switching screens no longer looks frozen while its data
// loads.
export default function Loading() {
  return <LoadingTraveler />;
}
