"use client";

import { useState } from "react";

export function ReferralCard({ code, referredCount, rewardIls }: { code: string; referredCount: number; rewardIls: number }) {
  const [copied, setCopied] = useState(false);

  function copyLink() {
    const link = `${window.location.origin}/register?ref=${code}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  return (
    <div
      className="game-pop-in mb-8 flex flex-col gap-3 rounded-3xl border border-black/5 bg-white p-6"
      style={{ background: "linear-gradient(135deg, color-mix(in srgb, var(--primary) 8%, white), white)" }}
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-extrabold">🎁 הפניית חברים</h3>
          <p className="text-sm opacity-60">
            כל חבר שנרשם דרך הקישור שלכם ומשדרג לחבילה בתשלום — שניכם מקבלים {rewardIls}₪ קרדיט לחידוש המנוי.
          </p>
        </div>
        {referredCount > 0 && (
          <span className="shrink-0 rounded-full px-3 py-1 text-xs font-bold text-white" style={{ background: "#22C55E" }}>
            {referredCount} הצטרפו
          </span>
        )}
      </div>

      <div className="flex items-center gap-2 rounded-xl border px-3 py-2" style={{ borderColor: "color-mix(in srgb, var(--primary) 25%, transparent)" }}>
        <code className="min-w-0 flex-1 truncate text-sm opacity-70">
          {typeof window !== "undefined" ? window.location.origin : ""}/register?ref={code}
        </code>
        <button
          onClick={copyLink}
          className="shrink-0 rounded-full px-4 py-1.5 text-xs font-semibold text-white"
          style={{ background: "var(--primary)" }}
        >
          {copied ? "✓ הועתק!" : "העתקת קישור"}
        </button>
      </div>
    </div>
  );
}
