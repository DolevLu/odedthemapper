"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { resolvePromoDiscount } from "@/lib/promoCodes";

export function OrgConfirmButton({ billingCycle }: { billingCycle: "monthly" | "annual" }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [promoCode, setPromoCode] = useState("");
  const promoDiscount = resolvePromoDiscount(promoCode);

  async function handleSubmit() {
    setLoading(true);
    setError(null);
    const res = await fetch("/api/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ planKey: "org", billingCycle, destinationIds: [], promoCode: promoCode || undefined }),
    });
    const body = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(body.error ?? "שגיאה");
      return;
    }
    router.push(body.checkoutUrl);
  }

  return (
    <div className="flex flex-col gap-3">
      <label className="text-sm font-medium opacity-70">
        קוד קופון (אופציונלי)
        <input
          value={promoCode}
          onChange={(e) => setPromoCode(e.target.value)}
          placeholder="למשל TRAVI15"
          className="mt-1 block w-full rounded-xl border border-black/10 px-3 py-2 font-normal"
        />
        {promoDiscount > 0 && (
          <span className="mt-1 block text-xs font-semibold text-emerald-600">✓ הנחה של {Math.round(promoDiscount * 100)}% תחול בתשלום</span>
        )}
      </label>
      <button
        onClick={handleSubmit}
        disabled={loading}
        className="rounded-full px-6 py-3 font-semibold text-white disabled:opacity-50"
        style={{ background: "linear-gradient(135deg, #7C3AED, #EC4899)" }}
      >
        {loading ? "טוען..." : "מעבר לתשלום"}
      </button>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
