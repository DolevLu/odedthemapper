import Link from "next/link";
import Image from "next/image";
import { DestinationThemeProvider } from "@/components/theme/DestinationThemeProvider";
import type { DestinationSummary } from "@/lib/data/destinations";
import { PLANS, formatIls } from "@/lib/plans";
import { proxiedImageUrl } from "@/lib/imageProxy";

export function DestinationCard({ destination }: { destination: DestinationSummary }) {
  const isComingSoon = destination.status === "draft";
  const thumb = destination.heroImage ?? destination.heroPhotos[0];

  return (
    <DestinationThemeProvider theme={destination.theme} className="h-full">
      <Link
        href={isComingSoon ? "#" : `/trip/${destination.slug}`}
        aria-disabled={isComingSoon}
        className="game-pop-in group flex h-full flex-col overflow-hidden border transition-all duration-300 hover:-translate-y-1.5 hover:rotate-[-0.5deg] hover:shadow-xl"
        style={{
          borderRadius: "1.25rem",
          borderColor: "color-mix(in srgb, var(--primary) 20%, transparent)",
          background: "var(--surface)",
        }}
      >
        <div className="relative h-40 overflow-hidden">
          {thumb ? (
            // A raw <img> here was downloading each photo at its full
            // original resolution (often several MB straight from Wikipedia/
            // admin uploads) just to paint a 160px-tall card thumbnail — the
            // exact same bug PoiCard/PoiDetailModal had before switching to
            // next/image (see next.config.ts), which resizes and serves a
            // properly sized version instead. proxiedImageUrl routes
            // Wikimedia URLs (most hero photos) through our own proxy — see
            // lib/imageProxy.ts — since Wikimedia otherwise 429s next/image's
            // optimizer outright over its User-Agent policy.
            <Image
              src={proxiedImageUrl(thumb)}
              alt={destination.name}
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              loading="lazy"
              className="object-cover transition-transform duration-300 group-hover:scale-105"
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
              className="absolute start-3 top-3 rounded-full px-3 py-1 text-xs font-extrabold text-white shadow-md transition-transform duration-300 group-hover:-rotate-6 group-hover:scale-110"
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
              {isComingSoon ? "בקרוב" : `מ-${formatIls(PLANS.solo.monthlyCents)}/חודש`}
            </span>
          </div>
        </div>
      </Link>
    </DestinationThemeProvider>
  );
}
