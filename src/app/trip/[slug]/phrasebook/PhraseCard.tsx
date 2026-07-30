"use client";

export function PhraseCard({
  localPhrase,
  translation,
  pronunciation,
  locale,
}: {
  localPhrase: string;
  translation: string;
  pronunciation: string | null;
  locale: string;
}) {
  function speak() {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(localPhrase);
    utterance.lang = locale;
    window.speechSynthesis.speak(utterance);
  }

  return (
    <div
      className="flex flex-col gap-0.5 border p-2 sm:p-4"
      style={{ borderRadius: "var(--radius)", borderColor: "var(--primary)", background: "var(--surface)" }}
    >
      <div className="flex items-center justify-between gap-1">
        <p className="truncate text-sm font-semibold sm:text-lg">{localPhrase}</p>
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
