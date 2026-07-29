"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { PlanKey } from "@/lib/plans";

type DestOption = { id: string; slug: string; name: string; tagline: string | null };

export function DestinationPicker({
  planKey,
  billingCycle,
  limit,
  destinations,
  preselectId,
}: {
  planKey: PlanKey;
  billingCycle: "monthly" | "annual";
  limit: number;
  destinations: DestOption[];
  preselectId?: string;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<string[]>(preselectId ? [preselectId] : []);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function toggle(id: string) {
    setSelected((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= limit) return prev;
      return [...prev, id];
    });
  }

  async function handleSubmit() {
    if (selected.length === 0) {
      setError("בחרו לפחות יעד אחד");
      return;
    }
    setLoading(true);
    setError(null);
    const res = await fetch("/api/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ planKey, billingCycle, destinationIds: selected }),
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
    <div className="flex flex-col gap-4">
      <p className="text-sm font-medium opacity-70">
        בחרו {limit === 1 ? "יעד אחד" : `עד ${limit} יעדים`} ({selected.length}/{limit})
      </p>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {destinations.map((d) => {
          const checked = selected.includes(d.id);
          const disabled = !checked && selected.length >= limit;
          return (
            <button
              key={d.id}
              onClick={() => toggle(d.id)}
              disabled={disabled}
              className="flex items-center justify-between rounded-2xl border p-4 text-start disabled:opacity-40"
              style={{
                borderColor: checked ? "#7C3AED" : "rgba(0,0,0,0.1)",
                background: checked ? "#FAF5FF" : "white",
              }}
            >
              <span>
                <span className="block font-semibold">{d.name}</span>
                {d.tagline && <span className="block text-xs opacity-60">{d.tagline}</span>}
              </span>
              <span
                className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-xs text-white"
                style={{ borderColor: "#7C3AED", background: checked ? "#7C3AED" : "transparent" }}
              >
                {checked ? "✓" : ""}
              </span>
            </button>
          );
        })}
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        onClick={handleSubmit}
        disabled={loading}
        className="mt-2 rounded-full px-6 py-3 font-semibold text-white disabled:opacity-50"
        style={{ background: "linear-gradient(135deg, #7C3AED, #EC4899)" }}
      >
        {loading ? "טוען..." : "מעבר לתשלום"}
      </button>
    </div>
  );
}
