import { PricingCards } from "./PricingCards";

export default function PricingPage() {
  return (
    <div className="flex flex-1 flex-col" style={{ background: "#FBF6EE" }}>
      <div className="mx-auto w-full max-w-6xl px-6 py-16 text-center">
        <h1 className="text-4xl font-extrabold sm:text-5xl">תוכנית שמתאימה לאיך שאתם מטיילים</h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg opacity-70">
          מנוי חודשי, בלי התחייבות ארוכה. בטלו מתי שתרצו.
        </p>
      </div>
      <div className="mx-auto w-full max-w-6xl px-6 pb-24">
        <PricingCards />
      </div>
    </div>
  );
}
