"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Capacitor } from "@capacitor/core";
import { TextToSpeech } from "@capacitor-community/text-to-speech";
import { togglePhrasebookKnown } from "@/lib/actions/trip";

export function PhraseCard({
  entryId,
  slug,
  localPhrase,
  translation,
  pronunciation,
  locale,
  known,
  canTrack,
}: {
  entryId: string;
  slug: string;
  localPhrase: string;
  translation: string;
  pronunciation: string | null;
  locale: string;
  known: boolean;
  canTrack: boolean;
}) {
  const router = useRouter();
  const [optimisticKnown, setOptimisticKnown] = useState(known);
  const [, startTransition] = useTransition();

  // The browser's own window.speechSynthesis silently produced no sound at
  // all inside the native Android app — Android's system WebView component
  // doesn't reliably implement the Web Speech Synthesis API the way a full
  // Chrome tab does. @capacitor-community/text-to-speech uses Android's own
  // native TextToSpeech engine inside the app instead, and falls back to
  // this exact same window.speechSynthesis call in a real browser/PWA — one
  // API that's actually reliable on both, instead of hand-rolling the
  // native/web branch here.
  //
  // Switching to the native plugin didn't fully fix silent playback: its
  // Android side (TextToSpeechPlugin.speak) checks isLanguageSupported(lang)
  // BEFORE speaking and rejects outright with "This language is not
  // supported" when the full region tag (e.g. "cs-CZ") has no voice data
  // installed — which a bare .catch(() => {}) was swallowing with zero
  // feedback, so it looked identical to total silence. Android's engine
  // often does have the bare language ("cs") installed even when the
  // region variant isn't, so that's tried as a fallback before giving up;
  // only if both fail do we tell the user why, since that's a real device
  // limitation (no voice pack for this language) they can act on.
  function speak() {
    TextToSpeech.speak({ text: localPhrase, lang: locale }).catch(() => {
      const baseLang = locale.split("-")[0];
      const fallback = baseLang !== locale ? TextToSpeech.speak({ text: localPhrase, lang: baseLang }) : Promise.reject();
      fallback.catch(() => {
        if (Capacitor.isNativePlatform()) {
          window.alert("קול לשפה הזו לא מותקן על המכשיר. ניתן להתקין קול נוסף דרך הגדרות הטלפון > נגישות > המרת טקסט לדיבור.");
        }
      });
    });
  }

  function toggleKnown() {
    if (!canTrack) {
      router.push(`/login?callbackUrl=${encodeURIComponent(`/trip/${slug}/phrasebook`)}`);
      return;
    }
    setOptimisticKnown((v) => !v);
    startTransition(() => {
      togglePhrasebookKnown(entryId, slug);
    });
  }

  return (
    <div
      className="flex flex-col gap-0.5 border p-2 transition-colors sm:p-4"
      style={{
        borderRadius: "var(--radius)",
        borderColor: optimisticKnown ? "color-mix(in srgb, #22C55E 55%, var(--primary))" : "var(--primary)",
        background: optimisticKnown ? "color-mix(in srgb, #22C55E 8%, var(--surface))" : "var(--surface)",
      }}
    >
      <div className="flex items-center justify-between gap-1">
        <button
          onClick={toggleKnown}
          className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md border text-xs font-bold transition-transform hover:scale-110"
          style={{
            borderColor: optimisticKnown ? "#22C55E" : "color-mix(in srgb, var(--primary) 40%, transparent)",
            background: optimisticKnown ? "#22C55E" : "transparent",
            color: "white",
          }}
          aria-label="סימון כידוע"
          title="אני יודע/ת את זה"
        >
          {optimisticKnown ? "✓" : ""}
        </button>
        <p className="min-w-0 flex-1 truncate text-sm font-semibold sm:text-lg">{localPhrase}</p>
        <button
          onClick={speak}
          className="shrink-0 rounded-full p-1 text-sm"
          style={{ color: "var(--primary)" }}
          aria-label="השמעה"
          title="השמעה"
        >
          🔊
        </button>
      </div>
      <p className="truncate text-xs opacity-70 sm:text-sm">{translation}</p>
      {pronunciation && <p className="hidden text-xs opacity-50 sm:block">{pronunciation}</p>}
    </div>
  );
}
