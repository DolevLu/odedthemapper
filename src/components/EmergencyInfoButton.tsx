"use client";

import { useState } from "react";
import { DESTINATION_FACTS } from "@/lib/destinationFacts";

/** Red "🆘" button next to the rain-mode one on the Now screen — opens a
 * quick-facts card: emergency numbers, plug/voltage, visa note for an
 * Israeli passport, and local tipping norms. All static reference data
 * (see destinationFacts.ts) — general guidance, not official advice. */
export function EmergencyInfoButton({ slug, destinationName }: { slug: string; destinationName: string }) {
  const [open, setOpen] = useState(false);
  const facts = DESTINATION_FACTS[slug];
  if (!facts) return null;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="rounded-full px-2.5 py-1.5 text-xs font-semibold text-white sm:px-4 sm:py-2 sm:text-sm"
        style={{ background: "#DC2626" }}
      >
        🆘 חירום
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center" onClick={() => setOpen(false)}>
          <div
            onClick={(e) => e.stopPropagation()}
            className="flex w-full max-w-md flex-col gap-3 rounded-2xl p-5"
            style={{ background: "var(--surface)" }}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold">🆘 מידע חירום ושימושי - {destinationName}</h2>
              <button onClick={() => setOpen(false)} className="text-xl opacity-50 hover:opacity-100" aria-label="סגירה">
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
              <InfoRow icon="🚨" label="מספרי חירום" value={facts.emergency} highlight />
              <InfoRow icon="🔌" label="שקע / מתח" value={`${facts.plug} · ${facts.voltage}`} />
              <InfoRow icon="🛂" label="ויזה לישראלים" value={facts.visaForIsraeli} />
              <InfoRow icon="💸" label="נהוג לטיפ" value={facts.tipping} />
            </div>

            <p className="text-[11px] opacity-40">
              מידע כללי לעזרה ראשונית - מומלץ לוודא מול מקורות רשמיים לפני הטיול, בפרט לגבי ויזה.
            </p>
          </div>
        </div>
      )}
    </>
  );
}

function InfoRow({ icon, label, value, highlight }: { icon: string; label: string; value: string; highlight?: boolean }) {
  return (
    <div
      className="flex flex-col gap-0.5 rounded-xl border p-3"
      style={{
        borderColor: highlight ? "#DC2626" : "color-mix(in srgb, var(--primary) 20%, transparent)",
        background: highlight ? "color-mix(in srgb, #DC2626 8%, transparent)" : "var(--background)",
      }}
    >
      <span className="text-xs opacity-60">
        {icon} {label}
      </span>
      <span className="font-semibold" style={highlight ? { color: "#DC2626" } : undefined}>
        {value}
      </span>
    </div>
  );
}
