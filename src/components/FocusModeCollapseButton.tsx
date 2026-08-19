"use client";

import { setFocusMode } from "@/hooks/useFocusMode";

/** Small collapse trigger embedded in the header and the sidebar (desktop
 * only — mobile has no persistent sidebar to hide) — hides both so the
 * page's main content (the map, most notably) can fill the whole screen.
 * See <FocusModeExitButton/> (mounted once, app-wide) for the way back. */
export function FocusModeCollapseButton({ className = "" }: { className?: string }) {
  return (
    <button
      onClick={() => setFocusMode(true)}
      className={`hidden h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm sm:flex ${className}`}
      style={{ background: "color-mix(in srgb, var(--primary, #7C3AED) 10%, transparent)", color: "var(--text, #1a1a1a)" }}
      title="הסתרת תפריטים והגדלת המסך"
      aria-label="הסתרת תפריטים והגדלת המסך"
    >
      ‹
    </button>
  );
}
