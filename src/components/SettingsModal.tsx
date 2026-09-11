"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

type ThemeChoice = "light" | "dark" | "system";
type FontChoice = "small" | "medium" | "large";

const FONT_SCALE: Record<FontChoice, string> = { small: "87.5%", medium: "100%", large: "115%" };
const THEME_OPTIONS: { value: ThemeChoice; label: string; icon: string }[] = [
  { value: "light", label: "בהיר", icon: "☀️" },
  { value: "dark", label: "כהה", icon: "🌙" },
  { value: "system", label: "מערכת", icon: "🖥️" },
];
const FONT_OPTIONS: { value: FontChoice; label: string }[] = [
  { value: "small", label: "קטן" },
  { value: "medium", label: "רגיל" },
  { value: "large", label: "גדול" },
];

function applyTheme(choice: ThemeChoice) {
  const resolved = choice === "system" ? (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light") : choice;
  document.documentElement.dataset.theme = resolved;
  localStorage.setItem("theme", choice);
}

function applyFontScale(choice: FontChoice) {
  document.documentElement.style.fontSize = FONT_SCALE[choice];
  localStorage.setItem("fontScale", FONT_SCALE[choice]);
}

/** Opened from GuideMenuButton's 3-dot menu (not its own sidebar button —
 * see that component for why: this and its sibling modals are portaled to
 * document.body since the sticky desktop sidebar traps regular fixed
 * children inside its own stacking context). */
export function SettingsModal({ onClose }: { onClose: () => void }) {
  // Read the current values on mount only — before that, this must render
  // the same default on server and client to avoid a hydration mismatch, so
  // the "real" localStorage-derived state is applied via this effect rather
  // than in useState's initializer.
  const [theme, setTheme] = useState<ThemeChoice>("system");
  const [font, setFont] = useState<FontChoice>("medium");

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme") as ThemeChoice | null;
    if (savedTheme) setTheme(savedTheme);
    const savedScale = localStorage.getItem("fontScale");
    const matchedFont = (Object.keys(FONT_SCALE) as FontChoice[]).find((k) => FONT_SCALE[k] === savedScale);
    if (matchedFont) setFont(matchedFont);
  }, []);

  return createPortal(
    <div className="fixed inset-0 z-[400] flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex w-full max-w-sm flex-col gap-4 rounded-2xl p-5 shadow-2xl"
        style={{ background: "var(--surface)" }}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">⚙️ הגדרות</h2>
          <button onClick={onClose} className="rounded-full px-2 py-1 text-lg opacity-60" aria-label="סגירה">
            ✕
          </button>
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-xs font-bold opacity-60">מראה</span>
          <div className="flex gap-2">
            {THEME_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => {
                  setTheme(opt.value);
                  applyTheme(opt.value);
                }}
                className="flex flex-1 flex-col items-center gap-1 rounded-xl px-2 py-2.5 text-xs font-semibold"
                style={{
                  background: theme === opt.value ? "var(--primary)" : "color-mix(in srgb, var(--text) 6%, transparent)",
                  color: theme === opt.value ? "white" : "var(--text)",
                }}
              >
                <span className="text-base">{opt.icon}</span>
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-xs font-bold opacity-60">גודל טקסט</span>
          <div className="flex gap-2">
            {FONT_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => {
                  setFont(opt.value);
                  applyFontScale(opt.value);
                }}
                className="flex-1 rounded-xl px-2 py-2.5 text-xs font-semibold"
                style={{
                  background: font === opt.value ? "var(--primary)" : "color-mix(in srgb, var(--text) 6%, transparent)",
                  color: font === opt.value ? "white" : "var(--text)",
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
