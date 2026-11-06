import Image from "next/image";
import type { DestinationSummary } from "@/lib/data/destinations";
import { proxiedImageUrl } from "@/lib/imageProxy";
import { destName, destTagline } from "@/lib/i18n/content";
import type { Lang } from "@/lib/i18n/dictionary";
import type { LandingCopy } from "@/lib/i18n/landing";
import { LangSwitchButton } from "./LangSwitchButton";

export function buyHref(slug: string) {
  return `/buy/${slug}`;
}

function photoOf(d: DestinationSummary) {
  return d.heroImage ?? d.heroPhotos[0] ?? null;
}

/** A destination card: photo, name over a soft gradient, tagline, the ₪49 price and a buy button. A plain <a> (not
 * <Link>): opening /buy/<slug> creates the order, so it must never be prefetched. */
export function LandingDestCard({ d, lang, copy, big = false }: { d: DestinationSummary; lang: Lang; copy: LandingCopy; big?: boolean }) {
  const photo = photoOf(d);
  return (
    <a
      href={buyHref(d.slug)}
      className="group flex h-full flex-col overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-black/10 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
    >
      <div className={`relative overflow-hidden ${big ? "h-56 sm:h-64" : "h-36 sm:h-44"}`}>
        {photo ? (
          <Image src={proxiedImageUrl(photo)} alt={destName(lang, d.slug, d.name)} fill sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 360px" loading="lazy" className="object-cover transition-transform duration-500 group-hover:scale-105" />
        ) : (
          <div className="h-full w-full" style={{ background: "linear-gradient(135deg, #7C3AED, #EC4899)" }} />
        )}
        <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/60 to-transparent" />
        <span className="absolute bottom-2 start-3 text-lg font-extrabold text-white drop-shadow sm:text-xl">{destName(lang, d.slug, d.name)}</span>
        {d.isBestSeller && (
          <span className="absolute end-2 top-2 rounded-full px-2.5 py-1 text-[11px] font-extrabold text-white shadow" style={{ background: "#6D28D9" }}>
            🔥 BEST
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-3.5 sm:p-4">
        <p className="line-clamp-2 min-h-[2.5rem] text-sm opacity-70">{destTagline(lang, d.slug, d.tagline)}</p>
        <div className="mt-auto flex items-center justify-between gap-2 text-xs">
          <span className="text-neutral-500">{d.poiCount > 0 ? `+${d.poiCount} ${copy.all.points}` : ""}</span>
          <span className="font-extrabold" style={{ color: "#6D28D9" }}>
            {copy.all.from}
          </span>
        </div>
        <span className="mt-1 rounded-full py-2.5 text-center text-sm font-bold text-white transition-transform group-hover:scale-[1.02]" style={{ background: "#6D28D9" }}>
          {copy.all.get}
        </span>
      </div>
    </a>
  );
}

export function Banner({ color, children }: { color: string; children: React.ReactNode }) {
  return (
    <div className="col-span-full my-4 flex flex-col items-center justify-between gap-4 rounded-3xl px-6 py-6 text-center text-white shadow-md sm:flex-row sm:px-10 sm:text-start" style={{ background: color }}>
      {children}
    </div>
  );
}

export function BannerCta({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a href={href} className="shrink-0 rounded-full border-2 border-white px-6 py-2.5 font-bold text-white transition hover:bg-white hover:text-black">
      {children}
    </a>
  );
}

/** "All destinations" - the grid in segments of 9, separated by banners (as on the reference layout). */
export function LandingDestinations({ destinations, lang, copy }: { destinations: DestinationSummary[]; lang: Lang; copy: LandingCopy }) {
  const seg = 9;
  const parts: DestinationSummary[][] = [];
  for (let i = 0; i < destinations.length; i += seg) parts.push(destinations.slice(i, i + seg));
  const feature = destinations.find((d) => d.isBestSeller && photoOf(d)) ?? destinations[0];
  const grid = "grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-3";
  return (
    <div className="flex flex-col gap-2">
      {parts.map((p, i) => (
        <div key={i} className="flex flex-col gap-2">
          <div className={grid}>
            {p.map((d) => (
              <LandingDestCard key={d.id} d={d} lang={lang} copy={copy} />
            ))}
          </div>
          {i === 0 && parts.length > 1 && (
            <Banner color="#111111">
              <div>
                <p className="text-xl font-extrabold sm:text-2xl">{copy.missing.title}</p>
                <p className="mt-1 opacity-90">{copy.missing.body}</p>
              </div>
              <BannerCta href="#contact">{copy.missing.cta}</BannerCta>
            </Banner>
          )}
          {i === 1 && parts.length > 2 && (
            <Banner color="#6D28D9">
              <div>
                <p className="text-xl font-extrabold sm:text-2xl">{copy.english.title}</p>
                <p className="mt-1 opacity-90">{copy.english.body}</p>
              </div>
              <LangSwitchButton to={lang === "he" ? "en" : "he"} className="shrink-0 rounded-full border-2 border-white px-6 py-2.5 font-bold text-white">
                {copy.english.cta}
              </LangSwitchButton>
            </Banner>
          )}
          {i === 2 && feature && (
            <a href={buyHref(feature.slug)} className="group relative col-span-full my-4 block min-h-[260px] overflow-hidden rounded-[2rem] shadow-lg">
              {photoOf(feature) && <Image src={proxiedImageUrl(photoOf(feature)!)} alt="" fill sizes="100vw" loading="lazy" className="object-cover transition-transform duration-700 group-hover:scale-105" />}
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
              <div className="relative flex min-h-[260px] flex-col justify-end gap-2 p-6 text-white sm:p-10">
                <span className="w-fit rounded-full bg-white/90 px-3 py-1 text-xs font-extrabold" style={{ color: "#6D28D9" }}>
                  {copy.big.title}
                </span>
                <p className="text-3xl font-extrabold sm:text-5xl">{destName(lang, feature.slug, feature.name)}</p>
                <p className="max-w-xl opacity-90">{destTagline(lang, feature.slug, feature.tagline)}</p>
                <span className="mt-2 w-fit rounded-full px-6 py-3 font-bold text-white" style={{ background: "#6D28D9" }}>
                  {copy.big.cta} · ₪49
                </span>
              </div>
            </a>
          )}
        </div>
      ))}
    </div>
  );
}
