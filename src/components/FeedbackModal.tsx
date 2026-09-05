"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { submitFeedback } from "@/lib/actions/feedback";

const KIND_OPTIONS: { value: "bug" | "suggestion"; label: string; icon: string }[] = [
  { value: "bug", label: "באג", icon: "🐞" },
  { value: "suggestion", label: "הצעה לשיפור", icon: "💡" },
];

export function FeedbackModal({ onClose }: { onClose: () => void }) {
  const pathname = usePathname();
  const [kind, setKind] = useState<"bug" | "suggestion">("bug");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(formData: FormData) {
    setStatus("sending");
    setErrorMessage(null);
    formData.set("kind", kind);
    formData.set("pageUrl", pathname ?? "");
    const result = await submitFeedback(formData);
    if ("error" in result) {
      setErrorMessage(result.error);
      setStatus("error");
      return;
    }
    setStatus("sent");
  }

  if (status === "sent") {
    return (
      <div className="fixed inset-0 z-[300] flex items-end justify-center bg-black/40 p-4 sm:items-center" onClick={onClose}>
        <div
          onClick={(e) => e.stopPropagation()}
          className="flex w-full max-w-sm flex-col items-center gap-3 rounded-2xl p-6 text-center shadow-2xl"
          style={{ background: "var(--surface)" }}
        >
          <span className="text-3xl">🙏</span>
          <h2 className="text-lg font-bold">תודה על הפנייה!</h2>
          <p className="text-sm opacity-70">קיבלנו את הדיווח ונבדוק אותו בהקדם.</p>
          <button onClick={onClose} className="mt-1 rounded-full px-4 py-2 text-sm font-bold text-white" style={{ background: "var(--primary)" }}>
            סגירה
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[300] flex items-end justify-center bg-black/40 p-4 sm:items-center" onClick={onClose}>
      <form
        action={handleSubmit}
        onClick={(e) => e.stopPropagation()}
        className="flex w-full max-w-sm flex-col gap-3 rounded-2xl p-5 shadow-2xl"
        style={{ background: "var(--surface)" }}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">דיווח על באג / הצעה לשיפור</h2>
          <button type="button" onClick={onClose} className="rounded-full px-2 py-1 text-lg opacity-60" aria-label="סגירה">
            ✕
          </button>
        </div>

        <div className="flex gap-2">
          {KIND_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setKind(opt.value)}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-xl px-2 py-2.5 text-sm font-semibold"
              style={{
                background: kind === opt.value ? "var(--primary)" : "color-mix(in srgb, var(--text) 6%, transparent)",
                color: kind === opt.value ? "white" : "var(--text)",
              }}
            >
              <span>{opt.icon}</span>
              {opt.label}
            </button>
          ))}
        </div>

        <label className="text-xs opacity-60">
          תיאור
          <textarea
            name="description"
            required
            rows={4}
            placeholder={kind === "bug" ? "מה קרה? באיזה מסך?" : "מה הייתם רוצים שנוסיף או נשפר?"}
            className="mt-1 w-full rounded-xl border p-2 text-sm"
            style={{ borderColor: "color-mix(in srgb, var(--text) 20%, transparent)", background: "var(--background)" }}
          />
        </label>

        <label className="text-xs opacity-60">
          תמונה (לא חובה)
          <input type="file" name="image" accept="image/*" className="mt-1 block w-full text-xs" />
        </label>

        {status === "error" && errorMessage && <p className="text-xs font-semibold text-red-600">{errorMessage}</p>}

        <button
          type="submit"
          disabled={status === "sending"}
          className="mt-1 rounded-full px-4 py-2.5 text-sm font-bold text-white disabled:opacity-60"
          style={{ background: "var(--primary)" }}
        >
          {status === "sending" ? "שולח..." : "שליחה"}
        </button>
      </form>
    </div>
  );
}
