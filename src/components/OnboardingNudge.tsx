"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

/** Shown to a newly-paying user who hasn't done any of the 3 basic setup
 * steps yet for this destination — without this, a first-time visitor lands
 * on a screen with zero personal data and has to guess what to do next.
 * Disappears automatically once any of the 3 is done (parent only renders
 * this when all 3 are still missing) or once dismissed — dismissal is
 * per-destination and per-browser (localStorage), not a DB round-trip for
 * something this low-stakes. */
export function OnboardingNudge({ slug }: { slug: string }) {
  const storageKey = `onboarding-dismissed:${slug}`;
  const [dismissed, setDismissed] = useState(true); // default hidden until we know localStorage says otherwise, avoids a flash

  useEffect(() => {
    try {
      setDismissed(localStorage.getItem(storageKey) === "1");
    } catch {
      setDismissed(false);
    }
  }, [storageKey]);

  function dismiss() {
    setDismissed(true);
    try {
      localStorage.setItem(storageKey, "1");
    } catch {
      // best-effort — worst case it shows again next visit
    }
  }

  if (dismissed) return null;

  const steps = [
    { href: `/trip/${slug}/logistics`, icon: "✈️", label: "הוסיפו טיסה" },
    { href: `/trip/${slug}/itinerary`, icon: "📅", label: "בנו מסלול" },
    { href: `/trip/${slug}`, icon: "🗺️", label: "עיינו במפה" },
  ];

  return (
    <div
      className="flex flex-col gap-3 border p-4"
      style={{ borderRadius: "var(--radius)", borderColor: "var(--primary)", background: "var(--surface)" }}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-bold">👋 בואו נתחיל - 3 צעדים ראשונים</p>
        <button onClick={dismiss} aria-label="סגירה" className="shrink-0 rounded-full px-2 py-1 text-xs opacity-50 hover:opacity-100">
          ✕
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        {steps.map((s) => (
          <Link
            key={s.href}
            href={s.href}
            className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold"
            style={{ background: "color-mix(in srgb, var(--primary) 10%, transparent)", color: "var(--text)" }}
          >
            <span>{s.icon}</span>
            <span>{s.label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
