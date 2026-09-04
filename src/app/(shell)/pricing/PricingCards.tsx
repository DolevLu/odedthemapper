"use client";

import { useState } from "react";
import Link from "next/link";
import { PLANS, TRIAL_PLAN, formatIls, annualMonthlyEquivalent, annualSavingsPercent } from "@/lib/plans";

export function PricingCards() {
  const [cycle, setCycle] = useState<"monthly" | "annual">("monthly");

  return (
    <div className="flex flex-col items-center gap-6 sm:gap-10">
      <div className="flex items-center gap-1 rounded-full bg-black/5 p-1">
        {(["monthly", "annual"] as const).map((c) => (
          <button
            key={c}
            onClick={() => setCycle(c)}
            className="rounded-full px-3 py-1.5 text-xs font-semibold sm:px-5 sm:py-2 sm:text-sm"
            style={{
              background: cycle === c ? "white" : "transparent",
              boxShadow: cycle === c ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
            }}
          >
            {c === "monthly" ? "חודשי" : "שנתי · חסכו עד 25%"}
          </button>
        ))}
      </div>

      <div className="grid w-full grid-cols-1 gap-4 sm:gap-6 md:grid-cols-4">
        {/* Trial card — first in DOM order, which in this always-RTL app
         * lands it at the physical right (the "first" spot), matching the
         * other three plans' own reading order. Deliberately not part of
         * the Object.values(PLANS) map below: it has no monthly/annual
         * price, its CTA starts the trial directly instead of linking to
         * the paid checkout flow, and TRIAL_PLAN itself isn't a PLANS
         * entry (see plans.ts for why). */}
        <div
          className="game-pop-in flex flex-col gap-3 rounded-3xl border p-4 transition-transform duration-300 hover:-translate-y-2 sm:gap-5 sm:p-8"
          style={{ borderColor: "rgba(0,0,0,0.08)", background: "white", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}
        >
          <div>
            <p className="text-xs font-semibold opacity-60 sm:text-sm">{TRIAL_PLAN.audience}</p>
            <h3 className="mt-1 text-lg font-extrabold sm:text-2xl">🎁 {TRIAL_PLAN.name}</h3>
            <p className="mt-2 text-xs opacity-70 sm:text-sm">{TRIAL_PLAN.tagline}</p>
          </div>

          <div className="flex flex-wrap gap-1.5 sm:gap-2">
            <span className="rounded-full bg-black/5 px-2 py-0.5 text-[11px] font-semibold sm:px-3 sm:py-1 sm:text-xs">🌍 יעד אחד</span>
            <span className="rounded-full bg-black/5 px-2 py-0.5 text-[11px] font-semibold sm:px-3 sm:py-1 sm:text-xs">⏱️ 24 שעות</span>
          </div>

          <div>
            <span className="text-2xl font-extrabold sm:text-4xl">חינם</span>
          </div>

          <ul className="flex flex-col gap-1.5 text-xs sm:gap-2 sm:text-sm">
            {TRIAL_PLAN.features.map((f) => (
              <li key={f} className="flex items-start gap-2">
                <span className="mt-0.5 text-emerald-500">✓</span>
                <span className="opacity-80">{f}</span>
              </li>
            ))}
          </ul>

          <Link
            href="/trial"
            className="mt-auto rounded-full px-4 py-2 text-center text-sm font-semibold text-white sm:px-5 sm:py-3 sm:text-base"
            style={{ background: "#1A1A1A" }}
          >
            התחלת ניסיון חינם
          </Link>
        </div>

        {Object.values(PLANS).map((plan) => {
          const price = cycle === "monthly" ? plan.monthlyCents : annualMonthlyEquivalent(plan);
          return (
            <div
              key={plan.key}
              className="game-pop-in group relative flex flex-col gap-3 rounded-3xl border p-4 transition-transform duration-300 hover:-translate-y-2 sm:gap-5 sm:p-8"
              style={{
                borderColor: plan.highlighted ? "#7C3AED" : "rgba(0,0,0,0.08)",
                background: plan.highlighted ? "linear-gradient(180deg, #FAF5FF, #FFFFFF)" : "white",
                boxShadow: plan.highlighted ? "0 20px 40px -12px rgba(124,58,237,0.25)" : "0 1px 3px rgba(0,0,0,0.05)",
              }}
            >
              {plan.highlighted && (
                <span
                  className="absolute -top-3 right-4 rounded-full px-2.5 py-1 text-[11px] font-bold text-white transition-transform duration-300 group-hover:-rotate-6 group-hover:scale-110 sm:right-8 sm:px-3 sm:text-xs"
                  style={{ background: "linear-gradient(135deg, #7C3AED, #EC4899)" }}
                >
                  ⭐ הכי פופולרי
                </span>
              )}
              <div>
                <p className="text-xs font-semibold opacity-60 sm:text-sm">{plan.audience}</p>
                <h3 className="mt-1 text-lg font-extrabold sm:text-2xl">{plan.name}</h3>
                <p className="mt-2 text-xs opacity-70 sm:text-sm">{plan.tagline}</p>
              </div>

              <div className="flex flex-wrap gap-1.5 sm:gap-2">
                <span className="rounded-full bg-black/5 px-2 py-0.5 text-[11px] font-semibold sm:px-3 sm:py-1 sm:text-xs">
                  🌍 {plan.destinationLimit === null ? "כל היעדים" : plan.destinationLimit === 1 ? "יעד אחד" : `עד ${plan.destinationLimit} יעדים`}
                </span>
                <span className="rounded-full bg-black/5 px-2 py-0.5 text-[11px] font-semibold sm:px-3 sm:py-1 sm:text-xs">
                  👤 {plan.seats === null ? "משתמשים ללא הגבלה" : plan.seats === 1 ? "משתמש אחד" : `עד ${plan.seats} משתמשים`}
                </span>
              </div>

              <div>
                <span className="text-2xl font-extrabold sm:text-4xl">{formatIls(price)}</span>
                <span className="text-xs opacity-60 sm:text-sm"> / חודש</span>
                {cycle === "annual" && (
                  <p className="mt-1 text-[11px] font-medium text-emerald-600 sm:text-xs">
                    {annualSavingsPercent(plan)}% הנחה, מחויב שנתית ({formatIls(plan.annualCents)})
                  </p>
                )}
              </div>

              <ul className="flex flex-col gap-1.5 text-xs sm:gap-2 sm:text-sm">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <span className="mt-0.5 text-emerald-500">✓</span>
                    <span className="opacity-80">{f}</span>
                  </li>
                ))}
              </ul>

              <Link
                href={`/subscribe/${plan.key}?cycle=${cycle}`}
                className="mt-auto rounded-full px-4 py-2 text-center text-sm font-semibold text-white sm:px-5 sm:py-3 sm:text-base"
                style={{
                  background: plan.highlighted
                    ? "linear-gradient(135deg, #7C3AED, #EC4899)"
                    : "#1A1A1A",
                }}
              >
                בחירת תוכנית
              </Link>
            </div>
          );
        })}
      </div>
    </div>
  );
}
