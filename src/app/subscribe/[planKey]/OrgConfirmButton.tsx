"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function OrgConfirmButton({ billingCycle }: { billingCycle: "monthly" | "annual" }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    setLoading(true);
    setError(null);
    const res = await fetch("/api/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ planKey: "org", billingCycle, destinationIds: [] }),
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
    <div className="flex flex-col gap-2">
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
