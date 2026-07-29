import { getAllDestinations } from "@/lib/data/destinations";
import { DestinationCard } from "@/components/DestinationCard";

export async function DestinationsGrid() {
  const destinations = await getAllDestinations();
  const live = destinations.filter((d) => d.status !== "draft");
  const comingSoon = destinations.filter((d) => d.status === "draft");

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {[...live, ...comingSoon].map((destination) => (
        <DestinationCard key={destination.id} destination={destination} />
      ))}
    </div>
  );
}
