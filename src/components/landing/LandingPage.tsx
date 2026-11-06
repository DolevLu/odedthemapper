import Image from "next/image";
import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getAllDestinations } from "@/lib/data/destinations";
import { getLang } from "@/lib/i18n/server";
import { getLandingCopy } from "@/lib/i18n/landing";
import { ScrollReveal } from "@/components/ScrollReveal";
import { LandingHeader } from "./LandingHeader";
import { LandingDestCard, LandingDestinations, BannerCta } from "./LandingDestinations";
import { WorldMap } from "./WorldMap";

// Brand rule: white background, black text, purple as the accent (used for buttons, numbers and a few panels).
const PURPLE = "#6D28D9";
const TINT = "#F5F1FF";

function Phone({ src, alt, className = "" }: { src: string; alt: string; className?: string }) {
  return (
    <div className={`relative mx-auto w-[210px] shrink-0 overflow-hidden rounded-[2rem] border-[6px] border-neutral-900 bg-neutral-900 shadow-2xl ${className}`} style={{ aspectRatio: "390 / 844" }}>
      <Image src={src} alt={alt} fill sizes="210px" className="object-cover object-top" />
    </div>
  );
}

function SectionTitle({ children, sub }: { children: React.ReactNode; sub?: string }) {
  return (
    <div className="mb-8 text-center">
      <h2 className="text-3xl font-extrabold sm:text-4xl">{children}</h2>
      <div className="mx-auto mt-3 h-1 w-14 rounded-full" style={{ background: PURPLE }} />
      {sub && <p className="mx-auto mt-3 max-w-xl text-neutral-600">{sub}</p>}
    </div>
  );
}

function BuyButton({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <a href="#destinations" className={`inline-block rounded-full px-9 py-4 text-lg font-extrabold text-white shadow-lg transition-transform hover:-translate-y-0.5 ${className}`} style={{ background: PURPLE }}>
      {children}
    </a>
  );
}

/** The public landing page: one country = one ₪49 payment, written as a store page - every section pushes toward the
 * buy button. Nothing of the app itself is shown here beyond screenshots - the platform opens only after a country is
 * bought (see /buy/[slug] and the trip layout's gate). Layout and flow follow the odedthemapper.com homepage (sticky
 * header, full-bleed hero with chips, promo strip, "most loved" cards, option panel, story card, stats, banners
 * between destination segments, bubbles, FAQ, world map, contact, footer) in Travi's own content and brand colors. */
export async function LandingPage() {
  const [session, lang, all, poiCount] = await Promise.all([auth(), getLang(), getAllDestinations(), prisma.pointOfInterest.count()]);
  const copy = getLandingCopy(lang);
  const destinations = all.filter((d) => d.status !== "draft");
  const loved = destinations.filter((d) => d.isBestSeller).slice(0, 4);
  const pois = `${(Math.floor(poiCount / 1000) * 1000).toLocaleString("en-US")}+`;

  return (
    <div id="top" dir={copy.dir} className="flex flex-1 flex-col pb-20 md:pb-0" style={{ background: "#FFFFFF", color: "#111111" }}>
      <LandingHeader nav={copy.nav} brand={copy.brand} loggedIn={Boolean(session?.user?.id)} lang={lang} />

      {/* HERO */}
      <section className="relative isolate flex min-h-[78vh] items-center justify-center overflow-hidden px-5 py-20 text-center text-white">
        <Image src="/hero-prague.jpg" alt="" fill priority sizes="100vw" className="-z-20 object-cover" />
        <div className="absolute inset-0 -z-10" style={{ background: "linear-gradient(180deg, rgba(0,0,0,0.55), rgba(0,0,0,0.45) 55%, rgba(0,0,0,0.72))" }} />
        <div className="mx-auto max-w-3xl">
          <h1 className="text-4xl font-extrabold leading-[1.15] drop-shadow-lg sm:text-6xl">
            {copy.hero.titleA}
            <br />
            <span className="rounded-xl px-3" style={{ background: PURPLE }}>{copy.hero.titleB}</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg font-medium opacity-95 sm:text-xl">{copy.hero.sub}</p>
          <div className="mt-7 flex flex-wrap items-center justify-center gap-2.5">
            {copy.hero.chips.map((c) => (
              <span key={c} className="rounded-full bg-white px-4 py-2 text-sm font-bold text-black shadow-md">
                {c}
              </span>
            ))}
          </div>
          <BuyButton className="mt-9">{copy.hero.cta}</BuyButton>
        </div>
        <a href="#promo" aria-label="scroll" className="absolute bottom-5 left-1/2 -translate-x-1/2 animate-bounce text-3xl opacity-90">
          ⌄
        </a>
      </section>

      {/* PROMO STRIP */}
      <div id="promo" className="flex flex-col items-center justify-center gap-3 px-5 py-4 text-center text-white sm:flex-row sm:gap-6" style={{ background: PURPLE }}>
        <p className="font-bold">{copy.promo.text}</p>
        <a href="#destinations" className="rounded-full border-2 border-white px-5 py-1.5 text-sm font-bold hover:bg-white hover:text-black">
          {copy.promo.cta}
        </a>
      </div>

      {/* MOST WANTED */}
      {loved.length > 0 && (
        <section className="mx-auto w-full max-w-6xl px-4 py-14">
          <SectionTitle>{copy.loved.title}</SectionTitle>
          <ScrollReveal>
            <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
              {loved.map((d) => (
                <LandingDestCard key={d.id} d={d} lang={lang} copy={copy} />
              ))}
            </div>
          </ScrollReveal>
        </section>
      )}

      {/* WHAT CHANGES FOR YOU - three screens */}
      <section id="features" className="w-full scroll-mt-20 py-14" style={{ background: TINT }}>
        <div className="mx-auto max-w-6xl px-4">
          <SectionTitle sub={copy.kinds.sub}>{copy.kinds.title}</SectionTitle>
          <div className="grid gap-5 lg:grid-cols-3">
            {copy.kinds.cards.map((c) => (
              <div key={c.title} className="relative flex flex-col items-center rounded-[2rem] bg-white p-6 text-center shadow-sm ring-1 ring-black/10">
                {"badge" in c && c.badge && (
                  <span className="absolute -top-3 end-5 rounded-full px-3 py-1 text-xs font-extrabold text-white shadow" style={{ background: PURPLE }}>
                    {c.badge}
                  </span>
                )}
                <h3 className="text-2xl font-extrabold">{c.title}</h3>
                <p className="mt-1 text-sm font-semibold" style={{ color: PURPLE }}>
                  {c.tag}
                </p>
                <Phone src={c.image} alt={c.title} className="mt-5 w-[170px]" />
                <ul className="mt-5 flex flex-col gap-2 text-start text-sm font-medium">
                  {c.bullets.map((b) => (
                    <li key={b} className="flex gap-2">
                      <span aria-hidden style={{ color: PURPLE }}>✓</span>
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="mt-9 text-center">
            <BuyButton>{copy.kinds.cta}</BuyButton>
          </div>
        </div>
      </section>

      {/* THE OFFER - value stack + price */}
      <section className="mx-auto w-full max-w-5xl px-4 py-14">
        <SectionTitle sub={copy.offer.sub}>{copy.offer.title}</SectionTitle>
        <div className="grid overflow-hidden rounded-[2rem] shadow-xl ring-1 ring-black/10 md:grid-cols-[1.4fr_1fr]">
          <ul className="flex flex-col gap-4 bg-white p-7 sm:p-9">
            {copy.offer.items.map((i) => (
              <li key={i} className="flex gap-3 font-semibold">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-sm text-white" style={{ background: PURPLE }}>
                  ✓
                </span>
                {i}
              </li>
            ))}
          </ul>
          <div className="flex flex-col items-center justify-center gap-2 p-8 text-center text-white" style={{ background: PURPLE }}>
            <p className="text-7xl font-extrabold leading-none">{copy.offer.price}</p>
            <p className="text-sm font-semibold opacity-90">{copy.offer.priceNote}</p>
            <p className="mt-2 text-lg font-extrabold">{copy.offer.perDay}</p>
            <p className="text-sm opacity-90">{copy.offer.compare}</p>
            <a href="#destinations" className="mt-4 w-full rounded-full bg-white px-6 py-4 text-lg font-extrabold text-black shadow-lg transition-transform hover:-translate-y-0.5">
              {copy.offer.cta}
            </a>
          </div>
        </div>
        <ul className="mt-5 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm font-bold text-neutral-700">
          {copy.offer.trust.map((x) => (
            <li key={x}>{x}</li>
          ))}
        </ul>
      </section>

      {/* STORY / PAIN */}
      <section className="mx-auto w-full max-w-6xl px-3 py-6">
        <div className="grid items-center gap-8 rounded-[2.5rem] bg-black p-6 text-white shadow-lg sm:p-10 lg:grid-cols-[1fr_auto]">
          <div>
            <h2 className="text-3xl font-extrabold sm:text-4xl">{copy.story.title}</h2>
            {copy.story.body.map((p) => (
              <p key={p} className="mt-3 text-lg opacity-90">
                {p}
              </p>
            ))}
            <ul className="mt-4 flex flex-col gap-2 font-bold">
              {copy.story.bullets.map((b) => (
                <li key={b}>
                  <span style={{ color: "#A78BFA" }}>✓</span> {b}
                </li>
              ))}
            </ul>
            <BuyButton className="mt-6 !px-8 !py-3.5 !text-base">{copy.story.cta}</BuyButton>
          </div>
          <Phone src="/landing/phrasebook.jpg" alt="" className="hidden lg:block" />
        </div>
      </section>

      {/* STATS */}
      <section className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-4 px-3 py-10 sm:grid-cols-3">
        {[
          { v: pois, l: copy.stats.pois },
          { v: String(destinations.length), l: copy.stats.destinations },
          { v: "₪49", l: copy.stats.price },
        ].map((s) => (
          <div key={s.l} className="rounded-3xl py-8 text-center ring-1 ring-black/10" style={{ background: TINT }}>
            <p dir="ltr" className="text-5xl font-extrabold" style={{ color: PURPLE }}>
              {s.v}
            </p>
            <p className="mt-1 font-bold text-neutral-700">{s.l}</p>
          </div>
        ))}
      </section>

      {/* TWO FEATURE BANNERS */}
      <section className="mx-auto grid w-full max-w-6xl gap-4 px-3 py-4 md:grid-cols-2">
        <div className="flex flex-col justify-between gap-4 rounded-[2rem] p-8 text-white shadow-md" style={{ background: PURPLE }}>
          <div>
            <h3 className="text-2xl font-extrabold">{copy.banners.live.title}</h3>
            <p className="mt-2 opacity-90">{copy.banners.live.body}</p>
          </div>
          <div>
            <BannerCta href="#features">{copy.banners.live.cta}</BannerCta>
          </div>
        </div>
        <div className="flex flex-col justify-between gap-4 rounded-[2rem] bg-black p-8 text-white shadow-md">
          <div>
            <h3 className="text-2xl font-extrabold">{copy.banners.phrase.title}</h3>
            <p className="mt-2 opacity-90">{copy.banners.phrase.body}</p>
          </div>
          <div>
            <BannerCta href="#destinations">{copy.banners.phrase.cta}</BannerCta>
          </div>
        </div>
      </section>

      {/* ALL DESTINATIONS */}
      <section id="destinations" className="mx-auto w-full max-w-6xl scroll-mt-20 px-3 py-14">
        <SectionTitle sub={`${destinations.length} ${copy.all.available}`}>{copy.all.title}</SectionTitle>
        <LandingDestinations destinations={destinations} lang={lang} copy={copy} />
      </section>

      {/* HOW IT WORKS */}
      <section id="how" className="w-full scroll-mt-20 py-14" style={{ background: TINT }}>
        <div className="mx-auto max-w-6xl px-4">
          <SectionTitle>{copy.how.title}</SectionTitle>
          <div className="grid gap-5 md:grid-cols-3">
            {copy.how.steps.map((s, i) => (
              <div key={s.title} className="rounded-3xl bg-white p-7 text-center shadow-sm ring-1 ring-black/10">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full text-xl font-extrabold text-white" style={{ background: PURPLE }}>
                  {i + 1}
                </div>
                <h3 className="mt-3 text-xl font-extrabold">{s.title}</h3>
                <p className="mt-2 text-neutral-600">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURE GRID */}
      <section className="mx-auto w-full max-w-6xl px-4 py-14">
        <SectionTitle>{copy.features.title}</SectionTitle>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {copy.features.items.map((f) => (
            <div key={f.title} className="flex gap-4 rounded-3xl bg-white p-5 ring-1 ring-black/10">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-2xl" style={{ background: TINT }}>
                {f.icon}
              </div>
              <div>
                <h3 className="font-extrabold">{f.title}</h3>
                <p className="mt-1 text-sm text-neutral-600">{f.body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* WHATSAPP-STYLE BUBBLES (an illustration, not testimonials) */}
      <section className="mx-auto w-full max-w-4xl px-4 py-10">
        <SectionTitle sub={copy.chat.sub}>{copy.chat.title}</SectionTitle>
        <div className="grid gap-5 md:grid-cols-2">
          {[
            { label: copy.chat.before, msgs: copy.chat.beforeMsgs, bg: "#F1F1F1" },
            { label: copy.chat.after, msgs: copy.chat.afterMsgs, bg: TINT },
          ].map((col) => (
            <div key={col.label} className="rounded-3xl p-5 ring-1 ring-black/10" style={{ background: col.bg }}>
              <p className="mb-3 text-center text-sm font-extrabold text-neutral-500">{col.label}</p>
              <div className="flex flex-col gap-2.5">
                {col.msgs.map((m, i) => (
                  <p key={m} className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm font-medium shadow-sm ${i % 2 ? "self-end text-white" : "self-start bg-white"}`} style={i % 2 ? { background: PURPLE } : undefined}>
                    {m}
                  </p>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="mx-auto w-full max-w-3xl scroll-mt-20 px-4 py-12">
        <SectionTitle>{copy.faq.title}</SectionTitle>
        <div className="flex flex-col gap-3">
          {copy.faq.items.map((f) => (
            <details key={f.q} className="group rounded-2xl bg-white p-5 ring-1 ring-black/10">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 font-extrabold">
                {f.q}
                <span className="text-2xl transition-transform group-open:rotate-45" style={{ color: PURPLE }}>
                  +
                </span>
              </summary>
              <p className="mt-3 text-neutral-700">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* WORLD MAP */}
      <section className="mx-auto w-full max-w-5xl px-4 py-12">
        <SectionTitle sub={copy.world.sub}>{copy.world.title}</SectionTitle>
        <div className="rounded-[2rem] bg-white p-4 ring-1 ring-black/10 sm:p-8">
          <WorldMap />
        </div>
      </section>

      {/* CONTACT */}
      <section id="contact" className="mx-auto w-full max-w-2xl scroll-mt-20 px-4 py-12">
        <SectionTitle sub={copy.contact.sub}>{copy.contact.title}</SectionTitle>
        <form action="mailto:dolev0018@gmail.com" method="post" encType="text/plain" className="flex flex-col gap-3 rounded-[2rem] bg-white p-6 ring-1 ring-black/10">
          <input name="name" placeholder={copy.contact.name} className="rounded-xl border border-black/15 px-4 py-3" />
          <input name="email" type="email" placeholder={copy.contact.email} className="rounded-xl border border-black/15 px-4 py-3" />
          <textarea name="message" rows={4} placeholder={copy.contact.msg} className="rounded-xl border border-black/15 px-4 py-3" />
          <button type="submit" className="rounded-full py-3.5 font-extrabold text-white" style={{ background: PURPLE }}>
            {copy.contact.send}
          </button>
        </form>
      </section>

      {/* FINAL CTA */}
      <section className="mx-auto w-full max-w-4xl px-4 pb-14">
        <div className="rounded-[2.5rem] px-8 py-14 text-center text-white shadow-xl" style={{ background: PURPLE }}>
          <h2 className="text-3xl font-extrabold sm:text-4xl">{copy.final.title}</h2>
          <p className="mx-auto mt-3 max-w-md opacity-90">{copy.final.body}</p>
          <a href="#destinations" className="mt-7 inline-block rounded-full bg-white px-8 py-4 text-lg font-extrabold text-black shadow-lg">
            {copy.final.cta}
          </a>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-black px-6 py-12 text-sm text-white">
        <div className="mx-auto grid w-full max-w-6xl gap-10 sm:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <p className="text-2xl font-extrabold">{copy.brand}</p>
            <p className="mt-3 max-w-xs opacity-70">{copy.footer.tagline}</p>
          </div>
          <div>
            <p className="text-xs font-bold tracking-wide opacity-50">{copy.footer.explore}</p>
            <div className="mt-3 flex flex-col gap-2.5 opacity-80">
              <a href="#destinations">{copy.footer.destinations}</a>
              <Link href="/guide">{copy.footer.guide}</Link>
            </div>
          </div>
          <div>
            <p className="text-xs font-bold tracking-wide opacity-50">{copy.footer.account}</p>
            <div className="mt-3 flex flex-col gap-2.5 opacity-80">
              <Link href="/account">{copy.footer.myAccount}</Link>
              <Link href="/delete-account">{copy.footer.delete}</Link>
            </div>
          </div>
          <div>
            <p className="text-xs font-bold tracking-wide opacity-50">{copy.footer.legal}</p>
            <div className="mt-3 flex flex-col gap-2.5 opacity-80">
              <Link href="/privacy">{copy.footer.privacy}</Link>
              <a href="#contact">{copy.footer.contact}</a>
            </div>
          </div>
        </div>
        <div className="mx-auto mt-10 w-full max-w-6xl border-t border-white/10 pt-6 text-xs opacity-50">
          © {new Date().getFullYear()} {copy.brand} · {copy.footer.rights}
        </div>
      </footer>

      {/* STICKY BUY BAR (phones) */}
      <div className="fixed inset-x-0 bottom-0 z-30 flex items-center justify-between gap-3 border-t border-black/10 bg-white px-4 py-3 shadow-[0_-6px_20px_rgba(0,0,0,0.1)] md:hidden">
        <p className="text-sm font-extrabold">{copy.sticky.text}</p>
        <a href="#destinations" className="shrink-0 rounded-full px-5 py-2.5 text-sm font-extrabold text-white" style={{ background: PURPLE }}>
          {copy.sticky.cta}
        </a>
      </div>
    </div>
  );
}
