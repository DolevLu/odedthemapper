export default function TripLoading() {
  return (
    <div className="flex flex-col gap-4">
      <div className="h-7 w-48 animate-pulse rounded-lg bg-black/5" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-24 animate-pulse rounded-2xl bg-black/5" />
        ))}
      </div>
    </div>
  );
}
