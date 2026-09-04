"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { startFreeTrial } from "@/lib/actions/trial";

type DestOption = { id: string; slug: string; name: string; tagline: string | null };

export function TrialDestinationPicker({
  destinations,
  preselectId,
}: {
  destinations: DestOption[];
  preselectId?: string;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<string | null>(preselectId ?? null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    if (!selected) {
      setError("בחרו יעד אחד");
      return;
    }
    setLoading(true);
    setError(null);
    const result = await startFreeTrial(selected);
    if ("error" in result) {
      setLoading(false);
      setError(result.error);
      return;
    }
    const dest = destinations.find((d) => d.id === selected);
    router.push(`/trip/${dest?.slug}`);
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm font-medium opacity-70">בחרו יעד אחד לניסיון של 24 שעות</p>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {destinations.map((d) => {
          const checked = selected === d.id;
          return (
            <button
              key={d.id}
              onClick={() => setSelected(d.id)}
              className="flex items-center justify-between rounded-2xl border p-4 text-start"
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
        disabled={loading || !selected}
        className="mt-2 rounded-full px-6 py-3 font-semibold text-white disabled:opacity-50"
        style={{ background: "linear-gradient(135deg, #7C3AED, #EC4899)" }}
      >
        {loading ? "מתחיל..." : "🎁 התחלת 24 שעות חינם"}
      </button>
    </div>
  );
}
