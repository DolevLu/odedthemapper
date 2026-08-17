"use client";

import { useFocusMode, setFocusMode } from "@/hooks/useFocusMode";

/** Mounted once, app-wide (root layout) — invisible whenever focus mode is
 * off (the normal case), and appears as a small floating button once it's
 * on, since the header/sidebar buttons that triggered it are themselves
 * hidden at that point and there'd otherwise be no way back. */
export function FocusModeExitButton() {
  const active = useFocusMode();
  if (!active) return null;

  return (
    <button
      onClick={() => setFocusMode(false)}
      className="fixed start-3 top-3 z-[300] hidden h-8 w-8 items-center justify-center rounded-full text-sm shadow-lg sm:flex"
      style={{ background: "white", color: "var(--text, #1a1a1a)" }}
      title="הצגת תפריטים"
      aria-label="הצגת תפריטים"
    >
      ‹
    </button>
  );
}
