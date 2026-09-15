"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { DICTIONARY, type DictionaryKey, type Lang } from "@/lib/i18n/dictionary";

function applyLang(lang: Lang) {
  document.documentElement.lang = lang === "he" ? "he" : "en";
  document.documentElement.dir = lang === "he" ? "rtl" : "ltr";
  localStorage.setItem("lang", lang);
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
 * names, POI names/descriptions) is deliberately untouched by this. */
export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("he");

  useEffect(() => {
    const saved = localStorage.getItem("lang") as Lang | null;
    if (saved === "he" || saved === "en") setLangState(saved);
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
