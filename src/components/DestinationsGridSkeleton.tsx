export function DestinationsGridSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex h-full flex-col overflow-hidden rounded-[1.25rem] border border-black/5 bg-white">
          <div className="h-40 animate-pulse bg-black/5" />
          <div className="flex flex-1 flex-col gap-3 p-5">
            <div className="h-4 w-2/3 animate-pulse rounded bg-black/5" />
            <div className="mt-auto flex items-center justify-between pt-3">
              <div className="h-3 w-20 animate-pulse rounded bg-black/5" />
              <div className="h-8 w-24 animate-pulse rounded-full bg-black/5" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
