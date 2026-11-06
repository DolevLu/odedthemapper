"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function MockPayButton({ subscriptionId, successUrl = "/account" }: { subscriptionId: string; successUrl?: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handlePay() {
    setLoading(true);
    const res = await fetch(`/api/subscribe/mock/${subscriptionId}/complete`, { method: "POST" });
    setLoading(false);
    if (res.ok) {
      router.push(successUrl);
      router.refresh();
    }
  }

  return (
    <button
      onClick={handlePay}
      disabled={loading}
      className="mt-6 w-full rounded-full px-4 py-3 font-semibold text-white disabled:opacity-50"
      style={{ background: "linear-gradient(135deg, #6D28D9, #8B5CF6)" }}
    >
      {loading ? "מעבד..." : "שלם עכשיו (מדומה)"}
    </button>
  );
}
