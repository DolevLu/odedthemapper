import Link from "next/link";
import { Suspense } from "react";
import { PLANS, PURCHASABLE_PLANS, formatIls } from "@/lib/plans";
import { DestinationsGrid } from "@/components/DestinationsGrid";
import { DestinationsGridSkeleton } from "@/components/DestinationsGridSkeleton";
import { FloatingTravelIcons } from "@/components/FloatingTravelIcons";
import { HeroAppPreview } from "@/components/HeroAppPreview";
import { ScrollReveal } from "@/components/ScrollReveal";
import { prisma } from "@/lib/prisma";
import { getLang, getServerT } from "@/lib/i18n/server";
import type { DictionaryKey } from "@/lib/i18n/dictionary";
import { translatePlan } from "@/lib/i18n/plans";

function buildFaq(t: (key: DictionaryKey) => string) {
  return [
    { q: t("home.faq.q1"), a: t("home.faq.a1") },
    { q: t("home.faq.q2"), a: t("home.faq.a2") },
    { q: t("home.faq.q3"), a: t("home.faq.a3") },
    { q: t("home.faq.q4"), a: t("home.faq.a4") },
    { q: t("home.faq.q5"), a: t("home.faq.a5") },
  ];
}

const GRADIENT = "linear-gradient(135deg, #6D28D9, #EC4899)";

/** Small inline version of public/icon.svg's circle+pin mark — reused wherever the homepage needs a standalone
 * brand badge (the footer logo) without pulling in a whole <Image>. */
function BrandMark({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 96 96" aria-hidden="true">
      <defs>
        <linearGradient id="footer-mark-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#7C3AED" />
          <stop offset="100%" stopColor="#EC4899" />
        </linearGradient>
      </defs>
      <circle cx="48" cy="48" r="48" fill="url(#footer-mark-g)" />
      <path d="M48 22c-12 0-21 9-21 21 0 16 21 31 21 31s21-15 21-31c0-12-9-21-21-21zm0 29a8 8 0 1 1 0-16 8 8 0 0 1 0 16z" fill="#fff" />
    </svg>
  );
}

/** The actual marketing homepage content — pulled out of (shell)/page.tsx
 * (which redirects paying users straight to their map) so /home can render
 * it directly with NO redirect check at all. Without a real escape hatch
 * like that, the sidebar's own "דף הבית" link would be broken for exactly
 * the users who most reliably click it: "/" always bouncing a paying user
 * straight back to the map they're already looking at.
 *
 * Section structure (hero / stats bento / how-it-works / destinations /
 * value props / plans / FAQ / final CTA / footer) is modeled on
 * lingolooper.com's homepage layout, per explicit request — same component
 * breakdown and flow, Travi's own brand colors and copy throughout. The
 * "In their words" testimonials section on that reference site was
 * deliberately NOT copied: Travi has no real collected user reviews yet, and
 * inventing fake names/quotes/star ratings to fill that slot would be
 * deceptive marketing content. "home.why" below covers the same "why trust
 * us" intent with honest, unattributed value-prop cards instead - swap in
 * real testimonials here once there are some to use. */
export async function HomePageContent() {
  const [t, lang] = await Promise.all([getServerT(), getLang()]);
  const FAQ = buildFaq(t);
  const freeText = translatePlan(lang, "free");
  const [destinationCount, poiCount, destinationNames] = await Promise.all([
    prisma.destination.count({ where: { status: { in: ["preview", "live"] }, isPublic: true } }),
    prisma.pointOfInterest.count(),
    prisma.destination.findMany({
      where: { status: { in: ["preview", "live"] }, isPublic: true },
      select: { name: true },
      orderBy: { name: "asc" },
    }),
  ]);
  const stats = [
    { label: t("home.stats.destinations"), value: String(destinationCount) },
    { label: t("home.stats.pois"), value: `${(Math.floor(poiCount / 1000) * 1000).toLocaleString("en-US")}+` },
    { label: t("home.stats.happyTravelers"), value: "250+" },
  ];

  const bentoCards = [
    { icon: "🗺️", value: `${destinationCount}+`, label: t("home.bento.destinationsLabel"), bg: "#F3EEFF" },
    { icon: "📍", value: `${(Math.floor(poiCount / 1000) * 1000).toLocaleString("en-US")}+`, label: t("home.bento.poisLabel"), bg: "#DCFCE7" },
    { icon: "💸", value: t("home.bento.freeValue"), label: t("home.bento.freeLabel"), bg: "#FEF3C7" },
    { icon: "🤖", value: t("home.bento.aiValue"), label: t("home.bento.aiLabel"), bg: "#FCE7F3" },
  ];

  const steps = [
    { icon: "📍", title: t("home.how.step1.title"), body: t("home.how.step1.body") },
    { icon: "🗓️", title: t("home.how.step2.title"), body: t("home.how.step2.body") },
    { icon: "🧭", title: t("home.how.step3.title"), body: t("home.how.step3.body") },
    { icon: "📸", title: t("home.how.step4.title"), body: t("home.how.step4.body") },
  ];

  const whyCards = [
    { icon: "💸", title: t("home.why.card1.title"), body: t("home.why.card1.body") },
    { icon: "📶", title: t("home.why.card2.title"), body: t("home.why.card2.body") },
    { icon: "🏛️", title: t("home.why.card3.title"), body: t("home.why.card3.body") },
    { icon: "🤖", title: t("home.why.card4.title"), body: t("home.why.card4.body") },
  ];

  const marqueeNames = destinationNames.map((d) => d.name);
  const marqueeLoop = [...marqueeNames, ...marqueeNames];

  return (
    <div className="flex flex-1 flex-col" style={{ background: "var(--background)" }}>
      {/* HERO */}
      <section className="relative overflow-hidden px-6 py-10 sm:py-20">
        <FloatingTravelIcons />
        <div
          className="pointer-events-none absolute left-1/2 top-0 h-[420px] w-[820px] -translate-x-1/2 rounded-full opacity-40 blur-3xl"
          style={{ background: "radial-gradient(circle, #F3EEFF, transparent 70%)" }}
          aria-hidden="true"
        />
        <div className="relative mx-auto grid w-full max-w-6xl items-center gap-12 text-center lg:grid-cols-[1.1fr_0.9fr] lg:text-start">
          <div>
            <span className="mb-4 inline-block rounded-full bg-white px-4 py-1.5 text-sm font-semibold shadow-sm">
              🧭 {stats[0].value} {t("home.stats.destinations")} · {stats[1].value} {t("home.stats.pois")}
            </span>
            <h1 className="text-3xl font-extrabold leading-tight sm:text-5xl">
              {t("home.heroTitle")}
              <br />
              {t("home.heroSubtitle")}
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-lg opacity-70 lg:mx-0">{t("home.heroBody")}</p>

            <div className="mt-8 flex flex-wrap justify-center gap-2.5 text-sm lg:justify-start">
              <Link
                href="/destinations"
                className="rounded-full px-5 py-2.5 font-bold text-white shadow-lg transition-transform hover:-translate-y-0.5"
                style={{ background: GRADIENT }}
              >
                {t("home.ctaAllDestinations")}
              </Link>
              <Link
                href="/destinations/quiz"
                className="rounded-full bg-white px-5 py-2.5 font-bold shadow-sm transition-transform hover:-translate-y-0.5"
              >
                {t("home.ctaNotSure")}
              </Link>
              <Link href="/pricing" className="rounded-full border border-black/10 bg-white px-5 py-2.5 font-bold transition-transform hover:-translate-y-0.5">
                {t("home.ctaPricingPrefix")}
                {formatIls(PLANS.solo.monthlyCents)}
                {t("home.ctaPricingSuffix")}
              </Link>
            </div>

            <div className="mt-14 flex flex-wrap justify-center gap-10 lg:justify-start">
              {stats.map((stat) => (
                <div key={stat.label} className="text-center lg:text-start">
                  <div className="text-3xl font-extrabold">{stat.value}</div>
                  <div className="text-sm opacity-60">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>

          <HeroAppPreview />
        </div>
      </section>

      {/* STATS BENTO — "why Travi" at a glance */}
      <section className="relative overflow-hidden px-6 pb-20">
        <FloatingTravelIcons variant="bento" />
        <ScrollReveal className="relative mx-auto w-full max-w-5xl">
          <div className="text-center">
            <span className="text-sm font-bold tracking-wide" style={{ color: "#EC4899" }}>
              {t("home.bento.eyebrow")}
            </span>
            <h2 className="mt-2 text-2xl font-extrabold sm:text-3xl">{t("home.bento.title")}</h2>
          </div>
          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {bentoCards.map((card) => (
              <div key={card.label} className="rounded-3xl p-6" style={{ background: card.bg }}>
                <span className="text-2xl">{card.icon}</span>
                <div className="mt-3 text-3xl font-extrabold">{card.value}</div>
                <div className="mt-1 text-sm font-semibold opacity-70">{card.label}</div>
              </div>
            ))}
          </div>
        </ScrollReveal>
      </section>

      {/* HOW IT WORKS */}
      <section className="relative overflow-hidden px-6 pb-20">
        <FloatingTravelIcons variant="how" />
        <ScrollReveal className="relative mx-auto w-full max-w-6xl">
          <div className="text-center">
            <span className="text-sm font-bold tracking-wide" style={{ color: "#EC4899" }}>
              {t("home.how.eyebrow")}
            </span>
            <h2 className="mt-2 text-2xl font-extrabold sm:text-3xl">{t("home.how.title")}</h2>
          </div>
          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((step, i) => (
              <div key={step.title} className="relative rounded-3xl border border-black/5 bg-white p-6 text-start shadow-sm">
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-extrabold text-white"
                  style={{ background: GRADIENT }}
                >
                  {i + 1}
                </div>
                <span className="mt-4 block text-2xl">{step.icon}</span>
                <h3 className="mt-2 font-extrabold">{step.title}</h3>
                <p className="mt-1.5 text-sm opacity-70">{step.body}</p>
              </div>
            ))}
          </div>
        </ScrollReveal>
      </section>

      {/* NEW: share a Reel / TikTok / Facebook post into Travi */}
      <section className="relative overflow-hidden px-6 pb-20">
        <ScrollReveal className="relative mx-auto w-full max-w-4xl rounded-3xl border border-black/5 bg-white p-8 text-center shadow-sm sm:p-10">
          <span className="rounded-full px-3 py-1 text-xs font-extrabold text-white" style={{ background: GRADIENT }}>
            {t("home.share.eyebrow")}
          </span>
          <h2 className="mt-3 text-2xl font-extrabold sm:text-3xl">{t("home.share.title")}</h2>
          <p className="mx-auto mt-2 max-w-2xl text-sm opacity-70 sm:text-base">{t("home.share.body")}</p>
          <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
            {[
              { icon: "📱", text: t("home.share.step1") },
              { icon: "↗️", text: t("home.share.step2") },
              { icon: "📍", text: t("home.share.step3") },
            ].map((s, i) => (
              <div key={i} className="rounded-2xl p-4" style={{ background: "color-mix(in srgb, #7C3AED 7%, white)" }}>
                <div className="text-3xl">{s.icon}</div>
                <p className="mt-1 text-sm font-bold">{s.text}</p>
              </div>
            ))}
          </div>
        </ScrollReveal>
      </section>

      {/* DESTINATIONS — scrolling marquee of every live city, then a curated grid */}
      <section className="relative overflow-hidden">
        <FloatingTravelIcons variant="destinations" />
        {/* dir="ltr" on the wrapper below is NOT about text direction - it forces the shrink-to-fit track inside
         * to rest flush with the wrapper's LEFT edge instead of inheriting the page's RTL (which positions a
         * narrower-than-100%-width block flush at its container's RTL inline-start, i.e. the RIGHT edge - that
         * broke the translateX(-50%) infinite-loop math, since the track's un-transformed resting position was
         * already off past the left side of the viewport). Needs to be on this OUTER wrapper, not just the
         * track div itself: a block's horizontal position within its parent follows the PARENT's direction,
         * not its own. Each pill's own Hebrew text still renders correctly RTL via the bidi algorithm - only
         * the pills' left-to-right ORDER and the track's resting position are affected. */}
        {marqueeNames.length > 0 && (
          <div dir="ltr" className="relative mb-10 overflow-hidden" aria-hidden="true">
            <div className="flex w-max gap-3 animate-marquee" data-dir="rtl">
              {marqueeLoop.map((name, i) => (
                <span
                  key={`${name}-${i}`}
                  className="flex shrink-0 items-center gap-1.5 rounded-full border border-black/5 bg-white px-4 py-2 text-sm font-semibold shadow-sm"
                >
                  📍 {name}
                </span>
              ))}
            </div>
          </div>
        )}
        <ScrollReveal className="relative mx-auto w-full max-w-6xl px-6 pb-20">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-2xl font-extrabold">{t("home.ourDestinations")}</h2>
            <Link href="/destinations" className="text-sm font-semibold underline">
              {t("home.allDestinationsArrow")}
            </Link>
          </div>
          <Suspense fallback={<DestinationsGridSkeleton />}>
            <DestinationsGrid />
          </Suspense>

          <div className="mt-8 flex justify-center">
            <Link
              href="/destinations"
              className="rounded-full px-6 py-3 font-bold text-white shadow-lg transition-transform hover:-translate-y-0.5"
              style={{ background: GRADIENT }}
            >
              {t("home.allDestinationsArrow")}
            </Link>
          </div>
        </ScrollReveal>
      </section>

      {/* WHY TRAVI — honest value props instead of fabricated testimonials */}
      <section className="relative overflow-hidden px-6 pb-20">
        <FloatingTravelIcons variant="why" />
        <ScrollReveal className="relative mx-auto w-full max-w-6xl">
          <div className="text-center">
            <span className="text-sm font-bold tracking-wide" style={{ color: "#EC4899" }}>
              {t("home.why.eyebrow")}
            </span>
            <h2 className="mt-2 text-2xl font-extrabold sm:text-3xl">{t("home.why.title")}</h2>
          </div>
          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {whyCards.map((card) => (
              <div key={card.title} className="rounded-3xl border border-black/5 bg-white p-6 text-start shadow-sm">
                <span className="text-2xl">{card.icon}</span>
                <h3 className="mt-3 font-extrabold">{card.title}</h3>
                <p className="mt-1.5 text-sm opacity-70">{card.body}</p>
              </div>
            ))}
          </div>
        </ScrollReveal>
      </section>

      {/* PLANS */}
      <section className="relative overflow-hidden px-6 pb-20">
        <FloatingTravelIcons variant="plans" />
        <ScrollReveal className="relative mx-auto w-full max-w-5xl rounded-3xl border border-black/5 bg-white p-10 text-center shadow-sm">
          <h2 className="text-2xl font-extrabold">{t("home.planForEveryTraveler")}</h2>
          <p className="mt-2 opacity-70">{t("home.planForEveryTravelerBody")}</p>
          {/* Free first in DOM order — right-most in this always-RTL layout
           * and top-most once the grid wraps to one column on mobile, same
           * as the /pricing page's own card order (see PricingCards.tsx). */}
          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-black/5 p-5 text-start transition-shadow hover:shadow-md">
              <p className="text-xs font-semibold opacity-60">{freeText.audience}</p>
              <p className="mt-1 text-lg font-extrabold">🎁 {freeText.name}</p>
              <p className="mt-1 text-xl font-extrabold" style={{ color: "#6D28D9" }}>
                {t("home.free")}
              </p>
              <p className="mt-2 text-xs opacity-70">{freeText.tagline}</p>
            </div>
            {PURCHASABLE_PLANS.map((plan) => {
              const planText = translatePlan(lang, plan.key);
              return (
                <div key={plan.key} className="rounded-2xl border border-black/5 p-5 text-start transition-shadow hover:shadow-md">
                  <p className="text-xs font-semibold opacity-60">{planText.audience}</p>
                  <p className="mt-1 text-lg font-extrabold">{planText.name}</p>
                  <p className="mt-1 text-xl font-extrabold" style={{ color: "#6D28D9" }}>
                    {formatIls(plan.monthlyCents)}
                    <span className="text-sm font-medium opacity-60">{t("home.perMonth")}</span>
                  </p>
                  <p className="mt-2 text-xs opacity-70">{planText.tagline}</p>
                </div>
              );
            })}
          </div>
          <p className="mt-6 text-sm font-bold" style={{ color: "#047857" }}>
            {t("pricing.cancelBanner")}
          </p>
          <Link
            href="/pricing"
            className="mt-4 inline-block rounded-full px-7 py-3.5 font-bold text-white transition-transform hover:-translate-y-0.5"
            style={{ background: GRADIENT }}
          >
            {t("home.comparePlans")}
          </Link>
        </ScrollReveal>
      </section>

      {/* FAQ */}
      <section className="relative overflow-hidden">
        <FloatingTravelIcons variant="faq" />
        <ScrollReveal className="relative mx-auto w-full max-w-3xl px-6 pb-20">
          <h2 className="mb-6 text-2xl font-extrabold">{t("home.faqTitle")}</h2>
          <div className="flex flex-col gap-4">
            {FAQ.map((item) => (
              <details key={item.q} className="rounded-2xl border border-black/10 bg-white p-4">
                <summary className="font-semibold">{item.q}</summary>
                <p className="mt-2 text-sm opacity-70">{item.a}</p>
              </details>
            ))}
          </div>
        </ScrollReveal>
      </section>

      {/* FINAL CTA */}
      <section className="relative overflow-hidden px-6 pb-16">
        <FloatingTravelIcons variant="finalCta" />
        <ScrollReveal className="relative mx-auto w-full max-w-4xl text-center text-white shadow-xl">
          <div className="relative overflow-hidden rounded-[32px]">
            <div className="absolute inset-0" style={{ background: GRADIENT }} aria-hidden="true" />
            <div className="relative px-8 py-14">
              <h2 className="text-2xl font-extrabold sm:text-3xl">{t("home.finalCta.title")}</h2>
              <p className="mx-auto mt-3 max-w-md opacity-90">{t("home.finalCta.body")}</p>
              <Link
                href="/destinations"
                className="mt-7 inline-block rounded-full bg-white px-7 py-3.5 font-bold shadow-lg transition-transform hover:-translate-y-0.5"
                style={{ color: "#6D28D9" }}
              >
                {t("home.finalCta.cta")}
              </Link>
            </div>
          </div>
        </ScrollReveal>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-black/5 px-6 py-12 text-sm">
        <div className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-10 sm:grid-cols-[1.3fr_1fr_1fr_1fr]">
          <div>
            <div className="flex items-center gap-2">
              <BrandMark />
              <span className="text-lg font-extrabold">טראבי</span>
            </div>
            <p className="mt-3 max-w-xs opacity-60">{t("footer.tagline")}</p>
          </div>
          <div>
            <p className="text-xs font-bold tracking-wide opacity-40">{t("footer.explore")}</p>
            <div className="mt-3 flex flex-col gap-2.5">
              <Link href="/destinations" className="opacity-70 hover:opacity-100">
                {t("footer.destinations")}
              </Link>
              <Link href="/pricing" className="opacity-70 hover:opacity-100">
                {t("footer.pricing")}
              </Link>
              <Link href="/guide" className="opacity-70 hover:opacity-100">
                {t("footer.guide")}
              </Link>
            </div>
          </div>
          <div>
            <p className="text-xs font-bold tracking-wide opacity-40">{t("footer.account")}</p>
            <div className="mt-3 flex flex-col gap-2.5">
              <Link href="/account" className="opacity-70 hover:opacity-100">
                {t("footer.myAccount")}
              </Link>
              <Link href="/delete-account" className="opacity-70 hover:opacity-100">
                {t("footer.deleteAccount")}
              </Link>
            </div>
          </div>
          <div>
            <p className="text-xs font-bold tracking-wide opacity-40">{t("footer.legal")}</p>
            <div className="mt-3 flex flex-col gap-2.5">
              <Link href="/privacy" className="opacity-70 hover:opacity-100">
                {t("footer.privacy")}
              </Link>
              <a href="mailto:oded.the.mapper@gmail.com" className="opacity-70 hover:opacity-100">
                {t("footer.contact")}
              </a>
            </div>
          </div>
        </div>
        <div className="mx-auto mt-10 w-full max-w-6xl border-t border-black/5 pt-6 text-xs opacity-50">
          © {new Date().getFullYear()} טראבי · {t("footer.rights")}
        </div>
      </footer>
    </div>
  );
}
