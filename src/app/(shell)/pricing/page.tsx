import { PricingCards } from "./PricingCards";
import { getServerT } from "@/lib/i18n/server";

export default async function PricingPage() {
  const t = await getServerT();
  return (
    <div className="flex flex-1 flex-col" style={{ background: "#FBF6EE" }}>
      <div className="mx-auto w-full max-w-6xl px-6 py-16 text-center">
        <h1 className="text-4xl font-extrabold sm:text-5xl">{t("pricing.title")}</h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg opacity-70">{t("pricing.subtitle")}</p>
      </div>
      <div className="mx-auto w-full max-w-6xl px-6 pb-24">
        <PricingCards />
      </div>
    </div>
  );
}
