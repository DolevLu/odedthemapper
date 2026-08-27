"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { cancelSubscription } from "@/lib/actions/subscription";

export function CancelSubscriptionButton({ subscriptionId, periodEndLabel }: { subscriptionId: string; periodEndLabel: string }) {
  const router = useRouter();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleConfirm() {
    setError(null);
    startTransition(async () => {
      const res = await cancelSubscription(subscriptionId);
      if (res?.error) {
        setError(res.error);
        return;
      }
      setConfirmOpen(false);
      router.refresh();
    });
  }

  return (
    <>
      <button onClick={() => setConfirmOpen(true)} className="mt-4 text-sm font-semibold text-red-600 underline hover:text-red-700">
        ביטול המנוי
      </button>

      {confirmOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-6" onClick={() => setConfirmOpen(false)}>
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-xl">
            <span className="text-3xl">⚠️</span>
            <h2 className="mt-2 text-lg font-bold">האם אתם בטוחים?</h2>
            <p className="mt-2 text-sm opacity-70">
              המנוי יישאר פעיל עד <span className="font-semibold">{periodEndLabel}</span> ולא יחודש אחרי זה - לא תחויבו שוב.
            </p>
            {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
            <div className="mt-5 flex gap-2">
              <button
                onClick={() => setConfirmOpen(false)}
                className="flex-1 rounded-full border border-black/10 px-4 py-2.5 text-sm font-semibold"
              >
                חזרה
              </button>
              <button
                onClick={handleConfirm}
                disabled={pending}
                className="flex-1 rounded-full bg-red-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
              >
                {pending ? "מבטל..." : "כן, לבטל"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
