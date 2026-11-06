import Image from "next/image";
import Link from "next/link";
import { getLandingCopy } from "@/lib/i18n/landing";
import { proxiedImageUrl } from "@/lib/imageProxy";
import { destName, destTagline } from "@/lib/i18n/content";
import type { Lang } from "@/lib/i18n/dictionary";

type GateDestination = { slug: string; name: string; tagline: string | null; heroImage: string | null; poiCount?: number };

/** What anyone without that country sees at /trip/<slug>/...: the destination, the ₪49 price, what's inside and a
 * few screens - never the platform itself. Buying goes through /buy/<slug> (sign up first if needed) and lands back
 * in the platform. */
export function CountryGate({ destination, isLoggedIn, lang }: { destination: GateDestination; isLoggedIn: boolean; lang: Lang }) {
  const copy = getLandingCopy(lang);
  const g = copy.gate;
  const name = destName(lang, destination.slug, destination.name);
  const buy = `/buy/${destination.slug}`;
  return (
    <main dir={copy.dir} className="flex min-h-screen flex-1 flex-col" style={{ background: "#FFFFFF", color: "#111111" }}>
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-4">
        <Link href="/" className="text-xl font-extrabold" style={{ color: "#111111" }}>
          {copy.brand}
        </Link>
        <div className="flex items-center gap-3 text-sm font-bold">
          {!isLoggedIn && (
            <Link href={`/login?callbackUrl=${encodeURIComponent(`/trip/${destination.slug}`)}`} className="rounded-full border border-black/10 bg-white px-4 py-2">
              {g.login}
            </Link>
          )}
          <Link href="/#destinations" className="opacity-70 hover:opacity-100">
            {g.all}
          </Link>
        </div>
      </div>

      <section className="mx-auto w-full max-w-5xl px-4 pb-14">
        <div className="relative isolate overflow-hidden rounded-[2.5rem] text-white shadow-xl">
          {destination.heroImage ? (
            <Image src={proxiedImageUrl(destination.heroImage)} alt="" fill priority sizes="100vw" className="-z-20 object-cover" />
          ) : (
            <div className="absolute inset-0 -z-20" style={{ background: "#6D28D9" }} />
          )}
          <div className="absolute inset-0 -z-10 bg-gradient-to-t from-black/75 via-black/35 to-black/20" />
          <div className="flex min-h-[340px] flex-col justify-end gap-3 p-7 sm:p-12">
            <span className="w-fit rounded-full bg-white/90 px-3 py-1 text-xs font-extrabold" style={{ color: "#6D28D9" }}>
              {g.kicker} {name}
            </span>
            <h1 className="text-4xl font-extrabold leading-tight sm:text-6xl">{g.title(name)}</h1>
            <p className="max-w-xl text-lg opacity-90">{destTagline(lang, destination.slug, destination.tagline)}</p>
          </div>
        </div>

        <div className="mt-6 grid gap-6 md:grid-cols-[1.2fr_1fr]">
          <div className="rounded-[2rem] bg-white p-7 shadow-sm ring-1 ring-black/10">
            <p className="font-bold opacity-70">{g.sub}</p>
            <ul className="mt-4 flex flex-col gap-3 font-semibold">
              {g.includes.map((i) => (
                <li key={i} className="flex gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-sm text-white" style={{ background: "#6D28D9" }}>
                    ✓
                  </span>
                  {i}
                </li>
              ))}
            </ul>
            <div className="mt-6 flex gap-3 overflow-x-auto pb-2">
              {["map", "trails", "chat", "phrasebook"].map((s) => (
                <div key={s} className="relative h-[290px] w-[134px] shrink-0 overflow-hidden rounded-3xl border-4 border-neutral-900 bg-neutral-900 shadow-lg">
                  <Image src={`/landing/${s}.jpg`} alt="" fill sizes="134px" className="object-cover object-top" />
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-col justify-center rounded-[2rem] p-7 text-center text-white shadow-lg" style={{ background: "#6D28D9" }}>
            <p className="text-5xl font-extrabold">{g.price}</p>
            <p className="mt-2 text-sm opacity-90">{g.priceNote}</p>
            <a href={buy} className="mt-6 rounded-full bg-white px-6 py-4 text-lg font-extrabold text-black shadow-lg transition-transform hover:-translate-y-0.5">
              {isLoggedIn ? g.buy : g.buyLoggedOut}
            </a>
            {!isLoggedIn && (
              <p className="mt-4 text-sm opacity-90">
                {g.loginHint}{" "}
                <Link href={`/login?callbackUrl=${encodeURIComponent(`/trip/${destination.slug}`)}`} className="font-extrabold underline">
                  {g.login}
                </Link>
              </p>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
