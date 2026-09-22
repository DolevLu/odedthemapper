"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { DICTIONARY, type DictionaryKey, type Lang } from "@/lib/i18n/dictionary";

function applyLang(lang: Lang) {
  document.documentElement.lang = lang === "he" ? "he" : "en";
  document.documentElement.dir = lang === "he" ? "rtl" : "ltr";
  localStorage.setItem("lang", lang);
  // Server Components can't read localStorage — this cookie is what
  // src/lib/i18n/server.ts reads during SSR so server-rendered pages match
  // what the client-only chrome already shows.
  document.cookie = `lang=${lang}; path=/; max-age=31536000; SameSite=Lax`;
}

type LanguageContextValue = {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: DictionaryKey) => string;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

/** Mirrors SettingsModal's theme/font-scale pattern: localStorage is the
 * source of truth, applied synchronously before hydration by a head script
 * (see layout.tsx) to avoid a flash of the wrong dir/lang, then read again
 * here on mount so React state matches. Free/static dictionary only (see
 * lib/i18n/dictionary.ts) — no translation API, and DB content (destination
 * names, POI names/descriptions) is deliberately untouched by this.
 *
 * initialLang MUST come from the server (root layout's own getLang() call,
 * reading the same "lang" cookie applyLang writes below) rather than a
 * hardcoded "he" default — confirmed live as the cause of a full-page
 * "Minified React error #418" hydration crash for anyone whose cookie says
 * "en": Server Components elsewhere already render English via
 * getServerLang()/getServerT(), but this provider's own first client render
 * (the one React reconciles hydration against) was unconditionally Hebrew
 * until the effect below ran a tick later — a whole-tree text mismatch on
 * literally every navigation for that user, not a rare edge case. */
export function LanguageProvider({ children, initialLang }: { children: ReactNode; initialLang: Lang }) {
  const [lang, setLangState] = useState<Lang>(initialLang);

  useEffect(() => {
    // Safety net only, for the rare case the cookie (1-year max-age) and
    // localStorage (no expiry) have drifted apart — a plain post-mount
    // state update here is at worst a brief visible flash, never a
    // hydration mismatch, since it runs after hydration has already
    // reconciled against initialLang.
    const saved = localStorage.getItem("lang") as Lang | null;
    if (saved && saved !== lang && (saved === "he" || saved === "en")) setLangState(saved);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function setLang(next: Lang) {
    setLangState(next);
    applyLang(next);
  }

  function t(key: DictionaryKey): string {
    return DICTIONARY[key]?.[lang] ?? DICTIONARY[key]?.he ?? key;
  }

  return <LanguageContext.Provider value={{ lang, setLang, t }}>{children}</LanguageContext.Provider>;
}

export function useTranslation(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useTranslation must be used within a LanguageProvider");
  return ctx;
}
