import Link from "next/link";
import { Suspense } from "react";
import { PLANS, formatIls } from "@/lib/plans";
import { DestinationsGrid } from "@/components/DestinationsGrid";
import { DestinationsGridSkeleton } from "@/components/DestinationsGridSkeleton";
import { FloatingTravelIcons } from "@/components/FloatingTravelIcons";
import { HeroAppPreview } from "@/components/HeroAppPreview";
import { ScrollReveal } from "@/components/ScrollReveal";
import { prisma } from "@/lib/prisma";

const FAQ = [
  {
    q: "איך מקבלים גישה למפה אחרי הרשמה?",
    a: "מיד לאחר ההרשמה אתם יכולים להיכנס לכל יעד ולראות אותו מבפנים. שדרוג לחבילה בתשלום פותח את שאר המסכים.",
  },
  {
    q: "אפשר לנסות לפני שמשלמים?",
    a: "כן - נכנסים ישר למערכת של כל יעד ורואים חלק מהמסכים בחינם, לפני שבוחרים חבילה.",
  },
  {
    q: "המפה עובדת גם בלי אינטרנט?",
    a: "כן, לאחר טעינה ראשונה כל התוכן של היעד שברשותכם זמין גם במצב אופליין.",
  },
  {
    q: "אפשר לבטל את המנוי מתי שרוצים?",
    a: "בהחלט - אין התחייבות ארוכת טווח, אפשר לבטל בכל רגע.",
  },
];

/** The actual marketing homepage content — pulled out of (shell)/page.tsx
 * (which redirects paying users straight to their map) so /home can render
 * it directly with NO redirect check at all. Without a real escape hatch
 * like that, the sidebar's own "דף הבית" link would be broken for exactly
 * the users who most reliably click it: "/" always bouncing a paying user
 * straight back to the map they're already looking at. */
export async function HomePageContent() {
  const [destinationCount, poiCount] = await Promise.all([
    prisma.destination.count({ where: { status: { in: ["preview", "live"] } } }),
    prisma.pointOfInterest.count(),
  ]);
  const stats = [
    { label: "יעדים", value: String(destinationCount) },
    { label: "נקודות עניין", value: `${(Math.floor(poiCount / 1000) * 1000).toLocaleString("en-US")}+` },
    { label: "מטיילים מרוצים", value: "250+" },
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
              🧭 {stats[0].value} יעדים · {stats[1].value} נקודות עניין
            </span>
            <h1 className="text-3xl font-extrabold leading-tight sm:text-5xl">
              טראבי - פלטפורמת הטיולים
              <br />
              שהופכת כל טיסה להרפתקה
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-lg opacity-70 lg:mx-0">
              לכל יעד - עולם עיצובי משלו: מפה אינטראקטיבית, מתכנן מסלול יומי, שיחון, דוח הוצאות ועוד.
              היכנסו ישר למערכת של כל יעד - בחינם, עוד לפני שמשלמים.
            </p>

            <div className="mt-8 flex flex-wrap justify-center gap-2.5 text-sm lg:justify-start">
              <Link
                href="/destinations"
                className="rounded-full px-5 py-2.5 font-bold text-white shadow-lg transition-transform hover:-translate-y-0.5"
                style={{ background: "linear-gradient(135deg, #7C3AED, #EC4899)" }}
              >
                לכל היעדים
              </Link>
              <Link
                href="/destinations/quiz"
                className="rounded-full bg-white px-5 py-2.5 font-bold shadow-sm transition-transform hover:-translate-y-0.5"
              >
                ✈️ לא בטוחים לאן?
              </Link>
              <Link href="/pricing" className="rounded-full border border-black/10 bg-white px-5 py-2.5 font-bold transition-transform hover:-translate-y-0.5">
                תמחור - החל מ-{formatIls(PLANS.solo.monthlyCents)}/חודש
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
            <h2 className="text-2xl font-extrabold">היעדים שלנו</h2>
            <Link href="/destinations" className="text-sm font-semibold underline">
              לכל היעדים ←
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
              לכל היעדים ←
            </Link>
          </div>
        </ScrollReveal>
      </section>

      <section className="relative overflow-hidden px-6 pb-20">
        <FloatingTravelIcons variant="plans" />
        <ScrollReveal className="relative mx-auto w-full max-w-4xl rounded-3xl border border-black/5 bg-white p-10 text-center shadow-sm">
          <h2 className="text-2xl font-extrabold">תוכנית לכל סוג מטייל</h2>
          <p className="mt-2 opacity-70">ממטייל בודד ועד ארגוני נסיעות - יש לנו תוכנית שמתאימה לכם.</p>
          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
            {Object.values(PLANS).map((plan) => (
              <div key={plan.key} className="rounded-2xl border border-black/5 p-5 text-start transition-shadow hover:shadow-md">
                <p className="text-xs font-semibold opacity-60">{plan.audience}</p>
                <p className="mt-1 text-lg font-extrabold">{plan.name}</p>
                <p className="mt-1 text-xl font-extrabold" style={{ color: "#7C3AED" }}>
                  {formatIls(plan.monthlyCents)}<span className="text-sm font-medium opacity-60">/חודש</span>
                </p>
              </div>
            ))}
          </div>
          <Link
            href="/pricing"
            className="mt-8 inline-block rounded-full px-7 py-3.5 font-bold text-white transition-transform hover:-translate-y-0.5"
            style={{ background: "linear-gradient(135deg, #7C3AED, #EC4899)" }}
          >
            השוואת תוכניות
          </Link>
        </ScrollReveal>
      </section>

      <section className="relative overflow-hidden">
        <FloatingTravelIcons variant="faq" />
        <ScrollReveal className="relative mx-auto w-full max-w-3xl px-6 pb-20">
          <h2 className="mb-6 text-2xl font-extrabold">שאלות ותשובות</h2>
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
