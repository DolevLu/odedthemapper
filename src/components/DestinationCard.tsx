import Link from "next/link";
import { DestinationThemeProvider } from "@/components/theme/DestinationThemeProvider";
import type { DestinationSummary } from "@/lib/data/destinations";
import { PLANS, formatUsd } from "@/lib/plans";

export function DestinationCard({ destination }: { destination: DestinationSummary }) {
  const isComingSoon = destination.status === "draft";
  const thumb = destination.heroImage ?? destination.heroPhotos[0];

  return (
    <DestinationThemeProvider theme={destination.theme} className="h-full">
      <Link
        href={isComingSoon ? "#" : `/trip/${destination.slug}`}
        aria-disabled={isComingSoon}
        className="group flex h-full flex-col overflow-hidden border transition-shadow hover:shadow-xl"
        style={{
          borderRadius: "1.25rem",
          borderColor: "color-mix(in srgb, var(--primary) 20%, transparent)",
          background: "var(--surface)",
        }}
      >
        <div className="relative h-40 overflow-hidden">
          {thumb ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={thumb}
              alt={destination.name}
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <div
              className="flex h-full items-end p-5"
              style={{ background: `linear-gradient(135deg, var(--primary), var(--secondary))` }}
            >
              <span className="text-4xl font-bold tracking-wide text-white/90">{destination.slug.toUpperCase()}</span>
            </div>
          )}
          <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/50 to-transparent" />
          <span className="absolute bottom-2 right-3 text-lg font-extrabold text-white drop-shadow">
            {destination.name}
          </span>
          {destination.isBestSeller && (
            <span
              className="absolute start-3 top-3 rounded-full px-3 py-1 text-xs font-extrabold text-white shadow-md"
              style={{ background: "linear-gradient(135deg, #F59E0B, #DC2626)" }}
            >
              🔥 BEST SELLER
            </span>
          )}
        </div>

        <div className="flex flex-1 flex-col gap-3 p-5">
          {destination.tagline && <p className="text-sm opacity-70" style={{ color: "var(--text)" }}>{destination.tagline}</p>}

          <div className="mt-auto flex items-center justify-between pt-3 text-sm">
            <div className="flex flex-col gap-0.5 opacity-80" style={{ color: "var(--text)" }}>
              <span>{destination.poiCount > 0 ? `+${destination.poiCount} נקודות עניין` : "בקרוב"}</span>
              {destination.areaCount > 0 && <span>{destination.areaCount} אזורים</span>}
            </div>
            <span
              className="rounded-full px-4 py-2 font-semibold text-white transition-transform group-hover:scale-105"
              style={{ background: isComingSoon ? "#9CA3AF" : "var(--primary)" }}
            >
              {isComingSoon ? "בקרוב" : `מ-${formatUsd(PLANS.solo.monthlyCents)}/חודש`}
            </span>
          </div>
        </div>
      </Link>
    </DestinationThemeProvider>
  );
}
