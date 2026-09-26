"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "@/components/i18n/LanguageContext";
import { useBackToClose } from "@/hooks/useBackToClose";
import { fetchPreference, setNotifications } from "@/lib/pushClient";
import type { Lang } from "@/lib/i18n/dictionary";

type ThemeChoice = "light" | "dark" | "system";
type FontChoice = "small" | "medium" | "large";

const FONT_SCALE: Record<FontChoice, string> = { small: "87.5%", medium: "100%", large: "115%" };
const THEME_OPTIONS: { value: ThemeChoice; labelKey: "settings.light" | "settings.dark" | "settings.system"; icon: string }[] = [
  { value: "light", labelKey: "settings.light", icon: "☀️" },
  { value: "dark", labelKey: "settings.dark", icon: "🌙" },
  { value: "system", labelKey: "settings.system", icon: "🖥️" },
];
const FONT_OPTIONS: { value: FontChoice; labelKey: "settings.small" | "settings.regular" | "settings.large" }[] = [
  { value: "small", labelKey: "settings.small" },
  { value: "medium", labelKey: "settings.regular" },
  { value: "large", labelKey: "settings.large" },
];
const LANG_OPTIONS: { value: Lang; labelKey: "settings.hebrew" | "settings.english" }[] = [
  { value: "he", labelKey: "settings.hebrew" },
  { value: "en", labelKey: "settings.english" },
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
  const { lang, setLang, t } = useTranslation();
  useBackToClose(true, onClose);
  // Notifications switch: null = not logged in (row hidden), otherwise the saved preference (default ON).
  const [notifications, setNotificationsState] = useState<boolean | null>(null);
  const [notifBusy, setNotifBusy] = useState(false);
  const [notifNote, setNotifNote] = useState<string | null>(null);

  useEffect(() => {
    fetchPreference().then(setNotificationsState);
  }, []);

  async function toggleNotifications() {
    if (notifications === null || notifBusy) return;
    setNotifBusy(true);
    setNotifNote(null);
    const next = !notifications;
    const result = await setNotifications(next);
    setNotificationsState(next && result === "ok");
    if (next && result === "denied") setNotifNote(t("notif.deniedDesc"));
    else if (next && result === "error") setNotifNote(t("notif.subscribeFailedError"));
    setNotifBusy(false);
  }

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
          <h2 className="text-lg font-bold">{t("settings.title")}</h2>
          <button onClick={onClose} className="rounded-full px-2 py-1 text-lg opacity-60" aria-label={t("nav.close")}>
            ✕
          </button>
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-xs font-bold opacity-60">{t("settings.appearance")}</span>
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
                {t(opt.labelKey)}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-xs font-bold opacity-60">{t("settings.textSize")}</span>
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
                {t(opt.labelKey)}
              </button>
            ))}
          </div>
        </div>

        {notifications !== null && (
          <div className="flex flex-col gap-2">
            <span className="text-xs font-bold opacity-60">🔔 {t("notif.title")}</span>
            <button
              onClick={toggleNotifications}
              disabled={notifBusy}
              role="switch"
              aria-checked={notifications}
              className="flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-start text-xs font-semibold disabled:opacity-60"
              style={{ background: "color-mix(in srgb, var(--text) 6%, transparent)" }}
            >
              <span className="min-w-0">
                {notifications ? t("notif.enabled") : t("notif.disableBtn")}
                <span className="block text-[11px] font-normal opacity-60">{t("notif.defaultDesc")}</span>
              </span>
              <span className="relative h-6 w-11 shrink-0 rounded-full transition-colors" style={{ background: notifications ? "#16A34A" : "color-mix(in srgb, var(--text) 25%, transparent)" }}>
                <span className="absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all" style={{ insetInlineStart: notifications ? "1.375rem" : "0.125rem" }} />
              </span>
            </button>
            {notifNote && <p className="text-[11px] text-red-600">{notifNote}</p>}
          </div>
        )}

        <div className="flex flex-col gap-2">
          <span className="text-xs font-bold opacity-60">{t("settings.language")}</span>
          <div className="flex gap-2">
            {LANG_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setLang(opt.value)}
                className="flex-1 rounded-xl px-2 py-2.5 text-xs font-semibold"
                style={{
                  background: lang === opt.value ? "var(--primary)" : "color-mix(in srgb, var(--text) 6%, transparent)",
                  color: lang === opt.value ? "white" : "var(--text)",
                }}
              >
                {t(opt.labelKey)}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
