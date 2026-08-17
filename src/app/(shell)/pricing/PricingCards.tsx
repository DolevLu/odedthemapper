"use client";

import { useState } from "react";
import Link from "next/link";
import { PLANS, formatIls, annualMonthlyEquivalent, annualSavingsPercent } from "@/lib/plans";

export function PricingCards() {
  const [cycle, setCycle] = useState<"monthly" | "annual">("monthly");

  return (
    <div className="flex flex-col items-center gap-10">
      <div className="flex items-center gap-1 rounded-full bg-black/5 p-1">
        {(["monthly", "annual"] as const).map((c) => (
          <button
            key={c}
            onClick={() => setCycle(c)}
            className="rounded-full px-5 py-2 text-sm font-semibold"
            style={{
              background: cycle === c ? "white" : "transparent",
              boxShadow: cycle === c ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
            }}
          >
            {c === "monthly" ? "חודשי" : "שנתי · חסכו עד 25%"}
          </button>
        ))}
      </div>

      <div className="grid w-full grid-cols-1 gap-6 md:grid-cols-3">
        {Object.values(PLANS).map((plan) => {
          const price = cycle === "monthly" ? plan.monthlyCents : annualMonthlyEquivalent(plan);
          return (
            <div
              key={plan.key}
              className="game-pop-in group relative flex flex-col gap-5 rounded-3xl border p-8 transition-transform duration-300 hover:-translate-y-2"
              style={{
                borderColor: plan.highlighted ? "#7C3AED" : "rgba(0,0,0,0.08)",
                background: plan.highlighted ? "linear-gradient(180deg, #FAF5FF, #FFFFFF)" : "white",
                boxShadow: plan.highlighted ? "0 20px 40px -12px rgba(124,58,237,0.25)" : "0 1px 3px rgba(0,0,0,0.05)",
              }}
            >
              {plan.highlighted && (
                <span
                  className="absolute -top-3 right-8 rounded-full px-3 py-1 text-xs font-bold text-white transition-transform duration-300 group-hover:-rotate-6 group-hover:scale-110"
                  style={{ background: "linear-gradient(135deg, #7C3AED, #EC4899)" }}
                >
                  ⭐ הכי פופולרי
                </span>
              )}
              <div>
                <p className="text-sm font-semibold opacity-60">{plan.audience}</p>
                <h3 className="mt-1 text-2xl font-extrabold">{plan.name}</h3>
                <p className="mt-2 text-sm opacity-70">{plan.tagline}</p>
              </div>

              <div className="flex flex-wrap gap-2">
                <span className="rounded-full bg-black/5 px-3 py-1 text-xs font-semibold">
                  🌍 {plan.destinationLimit === null ? "כל היעדים" : plan.destinationLimit === 1 ? "יעד אחד" : `עד ${plan.destinationLimit} יעדים`}
                </span>
                <span className="rounded-full bg-black/5 px-3 py-1 text-xs font-semibold">
                  👤 {plan.seats === null ? "משתמשים ללא הגבלה" : plan.seats === 1 ? "משתמש אחד" : `עד ${plan.seats} משתמשים`}
                </span>
              </div>

              <div>
                <span className="text-4xl font-extrabold">{formatIls(price)}</span>
                <span className="text-sm opacity-60"> / חודש</span>
                {cycle === "annual" && (
                  <p className="mt-1 text-xs font-medium text-emerald-600">
                    {annualSavingsPercent(plan)}% הנחה, מחויב שנתית ({formatIls(plan.annualCents)})
                  </p>
                )}
              </div>

              <ul className="flex flex-col gap-2 text-sm">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <span className="mt-0.5 text-emerald-500">✓</span>
                    <span className="opacity-80">{f}</span>
                  </li>
                ))}
              </ul>

              <Link
                href={`/subscribe/${plan.key}?cycle=${cycle}`}
                className="mt-auto rounded-full px-5 py-3 text-center font-semibold text-white"
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
