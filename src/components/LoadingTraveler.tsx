/** Shared fallback for every route-level loading.tsx — a little figure
 * walking back and forth along a dashed path instead of a blank screen
 * while the next page's data loads. Server-renderable (no "use client"):
 * it's pure markup + CSS animation, no interactivity needed. */
export function LoadingTraveler() {
  return (
    <div className="flex min-h-[50vh] w-full flex-col items-center justify-center gap-4 py-16">
      <div className="relative h-10 w-56 max-w-[70vw]">
        <div
          className="absolute inset-x-0 bottom-1 border-b-2 border-dashed opacity-40"
          style={{ borderColor: "var(--primary, #7C3AED)" }}
        />
        <span className="loading-traveler-walk absolute bottom-1 inline-block text-2xl">🚶</span>
      </div>
      <p className="text-sm font-semibold opacity-50">טוענים את המסך...</p>
    </div>
  );
}
