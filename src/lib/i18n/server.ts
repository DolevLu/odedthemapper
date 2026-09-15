import { cookies } from "next/headers";
import { DICTIONARY, type DictionaryKey, type Lang } from "@/lib/i18n/dictionary";

/** Server-side counterpart to useTranslation() (LanguageContext.tsx) — most
 * of the app is Server Components (async page.tsx doing DB queries
 * directly), which can't reach a React client context/localStorage at all.
 * The client side writes a "lang" cookie alongside localStorage (see
 * applyLang) specifically so this can read the same preference during SSR. */
export async function getLang(): Promise<Lang> {
  const store = await cookies();
  return store.get("lang")?.value === "en" ? "en" : "he";
}

export function translate(lang: Lang, key: DictionaryKey): string {
  return DICTIONARY[key]?.[lang] ?? DICTIONARY[key]?.he ?? key;
}

/** Convenience for a Server Component: `const t = await getServerT();` then
 * call `t("some.key")` same as the client hook's t(). */
export async function getServerT(): Promise<(key: DictionaryKey) => string> {
  const lang = await getLang();
  return (key: DictionaryKey) => translate(lang, key);
}
