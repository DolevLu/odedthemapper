"use client";

import { useState } from "react";
import { sendPriceQuote, deletePriceQuote, updateLeadStatus } from "@/lib/actions/quotes";

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  draft: { label: "טיוטה", color: "#6B7280" },
  sent: { label: "נשלח ללקוח", color: "#2563EB" },
  accepted: { label: "אושר וחתום", color: "#16A34A" },
};

const LEAD_STATUS_OPTIONS = [
  { value: "lead", label: "🌱 ליד חדש" },
  { value: "quoted", label: "📄 בהצעת מחיר" },
  { value: "planning", label: "🗺️ בתכנון" },
  { value: "closed_won", label: "✅ נסגר בהצלחה" },
  { value: "closed_lost", label: "❌ אבד" },
];

export function QuoteCard({
  quote,
  slug,
}: {
  quote: {
    id: string;
    clientName: string;
    tripDays: number;
    totalLabel: string;
    profitLabel: string;
    status: string;
    leadStatus: string;
    shareToken: string | null;
    signed: boolean;
  };
  slug: string;
}) {
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const status = STATUS_LABEL[quote.status] ?? STATUS_LABEL.draft;
  const url = quote.shareToken && typeof window !== "undefined" ? `${window.location.origin}/share/quote/${quote.shareToken}` : "";

  async function handleSend() {
    setLoading(true);
    await sendPriceQuote(quote.id, slug);
    setLoading(false);
  }

  function copy() {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="flex flex-col gap-2 border p-4" style={{ borderRadius: "var(--radius)", borderColor: "var(--primary)", background: "var(--surface)" }}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="font-bold">{quote.clientName}</h3>
          <p className="text-xs opacity-60">
            {quote.tripDays} ימים · {quote.totalLabel} · רווח: {quote.profitLabel}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {quote.signed && <span className="text-xs" title="נחתם">✍️</span>}
          <span className="rounded-full px-3 py-1 text-xs font-semibold text-white" style={{ background: status.color }}>
            {status.label}
          </span>
        </div>
      </div>

      <select
        defaultValue={quote.leadStatus}
        onChange={(e) => updateLeadStatus(quote.id, slug, e.target.value)}
        className="self-start rounded-full border px-3 py-1 text-xs font-semibold"
        style={{ borderColor: "var(--primary)" }}
      >
        {LEAD_STATUS_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>

      {quote.shareToken ? (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <input readOnly value={url} className="w-56 rounded-lg border px-2 py-1.5 text-xs" style={{ borderColor: "var(--primary)" }} />
          <button onClick={copy} className="rounded-full px-3 py-1.5 text-xs font-semibold text-white" style={{ background: "var(--primary)" }}>
            {copied ? "הועתק!" : "העתקה"}
          </button>
        </div>
      ) : (
        <button
          onClick={handleSend}
          disabled={loading}
          className="self-start rounded-full border px-4 py-2 text-xs font-semibold disabled:opacity-50"
          style={{ borderColor: "var(--primary)", color: "var(--primary)" }}
        >
          {loading ? "יוצר קישור..." : "📤 שליחה ללקוח"}
        </button>
      )}

      <form action={deletePriceQuote.bind(null, quote.id, slug)}>
        <button className="self-start text-xs opacity-50 underline hover:opacity-100">מחיקה</button>
      </form>
    </div>
  );
}
