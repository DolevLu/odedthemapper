import Link from "next/link";
import { Suspense } from "react";
import { PLANS, formatIls } from "@/lib/plans";
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
  ];
}

/** The actual marketing homepage content — pulled out of (shell)/page.tsx
 * (which redirects paying users straight to their map) so /home can render
 * it directly with NO redirect check at all. Without a real escape hatch
 * like that, the sidebar's own "דף הבית" link would be broken for exactly
 * the users who most reliably click it: "/" always bouncing a paying user
 * straight back to the map they're already looking at. */
export async function HomePageContent() {
  const [t, lang] = await Promise.all([getServerT(), getLang()]);
  const FAQ = buildFaq(t);
  const trialText = translatePlan(lang, "trial");
  const [destinationCount, poiCount] = await Promise.all([
    prisma.destination.count({ where: { status: { in: ["preview", "live"] }, isPublic: true } }),
    prisma.pointOfInterest.count(),
  ]);
  const stats = [
    { label: t("home.stats.destinations"), value: String(destinationCount) },
    { label: t("home.stats.pois"), value: `${(Math.floor(poiCount / 1000) * 1000).toLocaleString("en-US")}+` },
    { label: t("home.stats.happyTravelers"), value: "250+" },
  ];

  return (
    <div className="flex flex-1 flex-col" style={{ background: "#FBF6EE" }}>
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
                style={{ background: "linear-gradient(135deg, #7C3AED, #EC4899)" }}
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

      <section className="relative overflow-hidden">
        <FloatingTravelIcons variant="destinations" />
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
              style={{ background: "linear-gradient(135deg, #7C3AED, #EC4899)" }}
            >
              {t("home.allDestinationsArrow")}
            </Link>
          </div>
        </ScrollReveal>
      </section>

      <section className="relative overflow-hidden px-6 pb-20">
        <FloatingTravelIcons variant="plans" />
        <ScrollReveal className="relative mx-auto w-full max-w-5xl rounded-3xl border border-black/5 bg-white p-10 text-center shadow-sm">
          <h2 className="text-2xl font-extrabold">{t("home.planForEveryTraveler")}</h2>
          <p className="mt-2 opacity-70">{t("home.planForEveryTravelerBody")}</p>
          {/* First in DOM order — the trial, right-most in this always-RTL
           * layout and top-most once the grid wraps to one column on
           * mobile, same as the /pricing page's own card order. A touch
           * more detail than before (each card's tagline, not just name +
           * price) but still far short of the full pricing page. */}
          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-4">
            <div className="rounded-2xl border border-black/5 p-5 text-start transition-shadow hover:shadow-md">
              <p className="text-xs font-semibold opacity-60">{trialText.audience}</p>
              <p className="mt-1 text-lg font-extrabold">🎁 {trialText.name}</p>
              <p className="mt-1 text-xl font-extrabold" style={{ color: "#7C3AED" }}>
                {t("home.free")}
              </p>
              <p className="mt-2 text-xs opacity-70">{trialText.tagline}</p>
            </div>
            {Object.values(PLANS).map((plan) => {
              const planText = translatePlan(lang, plan.key);
              return (
                <div key={plan.key} className="rounded-2xl border border-black/5 p-5 text-start transition-shadow hover:shadow-md">
                  <p className="text-xs font-semibold opacity-60">{planText.audience}</p>
                  <p className="mt-1 text-lg font-extrabold">{planText.name}</p>
                  <p className="mt-1 text-xl font-extrabold" style={{ color: "#7C3AED" }}>
                    {formatIls(plan.monthlyCents)}<span className="text-sm font-medium opacity-60">{t("home.perMonth")}</span>
                  </p>
                  <p className="mt-2 text-xs opacity-70">{planText.tagline}</p>
                </div>
              );
            })}
          </div>
          <Link
            href="/pricing"
            className="mt-8 inline-block rounded-full px-7 py-3.5 font-bold text-white transition-transform hover:-translate-y-0.5"
            style={{ background: "linear-gradient(135deg, #7C3AED, #EC4899)" }}
          >
            {t("home.comparePlans")}
          </Link>
        </ScrollReveal>
      </section>

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

      <footer className="border-t border-black/5 px-6 py-8 text-center text-sm opacity-60">
        oded.the.mapper@gmail.com
      </footer>
    </div>
  );
}
