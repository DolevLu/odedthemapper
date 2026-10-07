"use client";

import Link from "next/link";
import { PURCHASABLE_PLANS, AD_FREE_FEATURE, formatIls, type Plan } from "@/lib/plans";
import { useTranslation } from "@/components/i18n/LanguageContext";
import { translatePlan } from "@/lib/i18n/plans";

// 2026-10-07: three cards — the one free week (not a PLANS/PURCHASABLE_PLANS entry; granted once per network at
// sign-up, see lib/freeWeek.ts), "solo" (₪29/month, one destination, one user) and "family" (₪99/month, every
// destination, up to 5 users). No monthly/annual toggle: both paid plans are simple monthly. org is still a real
// PURCHASABLE_PLANS entry (for the rare agency/planner lead) but isn't shown on this consumer pricing page at all; it's
// sold directly via /subscribe/org for anyone actually pointed there.
export function PricingCards() {
  const { t, lang } = useTranslation();
  const freeText = translatePlan(lang, "free");
  const paid = PURCHASABLE_PLANS.filter((p) => p.key === "solo" || p.key === "family");

  const chip = "rounded-full bg-black/5 px-2 py-0.5 text-[11px] font-semibold sm:px-3 sm:py-1 sm:text-xs";

  return (
    <div className="flex flex-col items-center gap-6 sm:gap-10">
      <div className="grid w-full max-w-5xl grid-cols-1 gap-4 sm:gap-6 md:grid-cols-3">
        {/* Free week — first in DOM order, which in this always-RTL app lands it at the physical right. */}
        <div
          className="game-pop-in flex flex-col gap-3 rounded-3xl border p-4 transition-transform duration-300 hover:-translate-y-2 sm:gap-5 sm:p-8"
          style={{ borderColor: "rgba(0,0,0,0.08)", background: "white", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}
        >
          <div>
            <p className="text-xs font-semibold opacity-60 sm:text-sm">{freeText.audience}</p>
            <h3 className="mt-1 text-lg font-extrabold sm:text-2xl">🎁 {freeText.name}</h3>
            <p className="mt-2 text-xs opacity-70 sm:text-sm">{freeText.tagline}</p>
          </div>

          <div className="flex flex-wrap gap-1.5 sm:gap-2">
            <span className={chip}>{t("pricing.oneDestinationPlain")}</span>
            <span className={chip}>{t("pricing.sevenDays")}</span>
          </div>

          <div>
            <span className="text-2xl font-extrabold sm:text-4xl">{t("pricing.free")}</span>
          </div>

          <ul className="flex flex-col gap-1.5 text-xs sm:gap-2 sm:text-sm">
            {freeText.features.map((f) => (
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
            {t("pricing.startFree")}
          </Link>
        </div>

        {paid.map((plan: Plan) => {
          const text = translatePlan(lang, plan.key as "solo" | "family");
          const popular = plan.highlighted;
          return (
            <div
              key={plan.key}
              className="game-pop-in group relative flex flex-col gap-3 rounded-3xl border p-4 transition-transform duration-300 hover:-translate-y-2 sm:gap-5 sm:p-8"
              style={
                popular
                  ? { borderColor: "#7C3AED", background: "linear-gradient(180deg, #FAF5FF, #FFFFFF)", boxShadow: "0 20px 40px -12px rgba(124,58,237,0.25)" }
                  : { borderColor: "rgba(0,0,0,0.08)", background: "white", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }
              }
            >
              {popular && (
                <span
                  className="absolute -top-3 right-4 rounded-full px-2.5 py-1 text-[11px] font-bold text-white transition-transform duration-300 group-hover:-rotate-6 group-hover:scale-110 sm:right-8 sm:px-3 sm:text-xs"
                  style={{ background: "linear-gradient(135deg, #6D28D9, #EC4899)" }}
                >
                  {t("pricing.mostPopular")}
                </span>
              )}
              <div>
                <p className="text-xs font-semibold opacity-60 sm:text-sm">{text.audience}</p>
                <h3 className="mt-1 text-lg font-extrabold sm:text-2xl">{text.name}</h3>
                <p className="mt-2 text-xs opacity-70 sm:text-sm">{text.tagline}</p>
              </div>

              <div className="flex flex-wrap gap-1.5 sm:gap-2">
                <span className={chip}>{plan.allDestinations ? `🌍 ${t("pricing.allDestinations")}` : `📍 ${t("pricing.oneDestinationPlain")}`}</span>
                <span className={chip}>{plan.seats && plan.seats > 1 ? `👥 ${t("pricing.upToUsersPrefix")} ${plan.seats} ${t("pricing.usersSuffix")}` : `👤 ${t("pricing.oneUser")}`}</span>
                <span className={chip}>🚫📢 {t("pricing.noAds")}</span>
                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-700 sm:px-3 sm:py-1 sm:text-xs">{t("pricing.cancelAnytime")}</span>
              </div>

              <div>
                <span className="text-2xl font-extrabold sm:text-4xl">{formatIls(plan.monthlyCents)}</span>
                <span className="text-xs opacity-60 sm:text-sm"> {t("pricing.perMonth")}</span>
              </div>

              <ul className="flex flex-col gap-1.5 text-xs sm:gap-2 sm:text-sm">
                {text.features.map((f, i) => {
                  const isAdFree = plan.features[i] === AD_FREE_FEATURE;
                  return (
                    <li key={f} className="flex items-start gap-2">
                      <span className="mt-0.5 text-emerald-500">✓</span>
                      <span className={isAdFree ? "font-bold" : "opacity-80"}>{f}</span>
                    </li>
                  );
                })}
              </ul>

              <Link
                href={`/subscribe/${plan.key}`}
                className="mt-auto rounded-full px-4 py-2 text-center text-sm font-semibold text-white sm:px-5 sm:py-3 sm:text-base"
                style={{ background: popular ? "linear-gradient(135deg, #6D28D9, #EC4899)" : "#1A1A1A" }}
              >
                {t("pricing.choosePlan")}
              </Link>
            </div>
          );
        })}
      </div>

      <p className="w-full max-w-3xl rounded-2xl bg-emerald-50 px-4 py-3 text-center text-sm font-bold text-emerald-800 sm:text-base">
        {t("pricing.cancelBanner")}
      </p>
    </div>
  );
}
