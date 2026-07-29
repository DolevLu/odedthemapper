import Link from "next/link";

export function UpgradeRequired({ tier }: { tier: "silver" | "gold" }) {
  const isGold = tier === "gold";
  return (
    <div
      className="mx-auto flex max-w-md flex-col items-center gap-4 border p-8 text-center"
      style={{ borderRadius: "var(--radius)", borderColor: "var(--primary)", background: "var(--surface)" }}
    >
      <span className="text-4xl">{isGold ? "💎" : "🔷"}</span>
      <h2 className="text-lg font-bold">
        {isGold ? "קטגוריה של חבילת היהלום" : "קטגוריה בתשלום"}
      </h2>
      <p className="text-sm opacity-70">
        {isGold
          ? "התכונה הזו זמינה רק במנוי לארגונים ומתכנני טיולים — התוכנית המקיפה ביותר שלנו."
          : "כדי לגשת למסך הזה צריך מנוי פעיל שכולל את היעד הנוכחי."}
      </p>
      <Link
        href="/pricing"
        className="rounded-full px-6 py-3 font-bold text-white"
        style={{ background: "linear-gradient(135deg, #7C3AED, #EC4899)" }}
      >
        ✨ שדרוג חבילה
      </Link>
    </div>
  );
}
