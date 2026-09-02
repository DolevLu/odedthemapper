import { getAllDestinations, type DestinationSummary } from "@/lib/data/destinations";
import { DestinationCard } from "@/components/DestinationCard";

// The home page is a teaser, not the full catalog (that's /destinations,
// linked right below this grid) — capped so it doesn't try to render every
// destination's photo on first load, and mixes in a shuffle so it isn't the
// exact same 12 on every visit.
const HOME_DESTINATION_COUNT = 12;

function shuffled<T>(items: T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export async function DestinationsGrid() {
  const destinations = await getAllDestinations();
  const live = destinations.filter((d) => d.status !== "draft");

  // Best sellers lead (shuffled among themselves too, so it's not always the
  // same order), then random picks from the rest fill up to the cap — a
  // destination this run's shuffle bumped past 12 slots simply isn't shown,
  // rather than every destination cramming onto the home page.
  const bestSellers = shuffled(live.filter((d) => d.isBestSeller));
  const rest = shuffled(live.filter((d) => !d.isBestSeller));
  const selected: DestinationSummary[] = [...bestSellers, ...rest].slice(0, HOME_DESTINATION_COUNT);

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {selected.map((destination) => (
        <DestinationCard key={destination.id} destination={destination} />
      ))}
    </div>
  );
}
