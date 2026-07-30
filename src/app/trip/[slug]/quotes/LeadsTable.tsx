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

export type Lead = {
  id: string;
  clientName: string;
  tripDays: number;
  revenueLabel: string;
  profitLabel: string;
  status: string;
  leadStatus: string;
  shareToken: string | null;
  signed: boolean;
};

export function LeadsTable({ leads, slug }: { leads: Lead[]; slug: string }) {
  if (leads.length === 0) {
    return <p className="text-sm opacity-60">עדיין לא נוצרו לידים ליעד הזה — הוסיפו אחד בטופס למעלה.</p>;
  }

  return (
    <div className="overflow-x-auto border" style={{ borderRadius: "var(--radius)", borderColor: "var(--primary)" }}>
      <table className="w-full min-w-[720px] border-collapse text-sm">
        <thead>
          <tr style={{ background: "color-mix(in srgb, var(--primary) 10%, transparent)" }}>
            <th className="p-3 text-start font-semibold">לקוח</th>
            <th className="p-3 text-start font-semibold">ימים</th>
            <th className="p-3 text-start font-semibold">הכנסה</th>
            <th className="p-3 text-start font-semibold">רווח</th>
            <th className="p-3 text-start font-semibold">סטטוס ליד</th>
            <th className="p-3 text-start font-semibold">מסמך</th>
            <th className="p-3 text-start font-semibold"></th>
          </tr>
        </thead>
        <tbody>
          {leads.map((lead) => (
            <LeadRow key={lead.id} lead={lead} slug={slug} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function LeadRow({ lead, slug }: { lead: Lead; slug: string }) {
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const status = STATUS_LABEL[lead.status] ?? STATUS_LABEL.draft;
  const url = lead.shareToken && typeof window !== "undefined" ? `${window.location.origin}/share/quote/${lead.shareToken}` : "";

  async function handleSend() {
    setLoading(true);
    await sendPriceQuote(lead.id, slug);
    setLoading(false);
  }

  function copy() {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <tr className="border-t" style={{ borderColor: "color-mix(in srgb, var(--primary) 15%, transparent)" }}>
      <td className="p-3 font-semibold">
        {lead.clientName}
        {lead.signed && (
          <span className="ms-1.5 text-xs" title="נחתם">
            ✍️
          </span>
        )}
      </td>
      <td className="p-3 opacity-70">{lead.tripDays}</td>
      <td className="p-3 opacity-70">{lead.revenueLabel}</td>
      <td className="p-3 font-semibold" style={{ color: "var(--primary)" }}>
        {lead.profitLabel}
      </td>
      <td className="p-3">
        <select
          defaultValue={lead.leadStatus}
          onChange={(e) => updateLeadStatus(lead.id, slug, e.target.value)}
          className="rounded-full border px-2.5 py-1 text-xs font-semibold"
          style={{ borderColor: "var(--primary)" }}
        >
          {LEAD_STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </td>
      <td className="p-3">
        <span className="rounded-full px-2.5 py-1 text-xs font-semibold text-white" style={{ background: status.color }}>
          {status.label}
        </span>
      </td>
      <td className="p-3">
        <div className="flex flex-wrap items-center gap-1.5">
          {lead.shareToken ? (
            <button onClick={copy} className="rounded-full border px-2.5 py-1 text-xs font-semibold" style={{ borderColor: "var(--primary)", color: "var(--primary)" }}>
              {copied ? "הועתק!" : "🔗 העתקת קישור"}
            </button>
          ) : (
            <button
              onClick={handleSend}
              disabled={loading}
              className="rounded-full border px-2.5 py-1 text-xs font-semibold disabled:opacity-50"
              style={{ borderColor: "var(--primary)", color: "var(--primary)" }}
            >
              {loading ? "יוצר..." : "📤 שליחה"}
            </button>
          )}
          <form action={deletePriceQuote.bind(null, lead.id, slug)}>
            <button className="rounded-full px-2 py-1 text-xs opacity-50 hover:opacity-100">🗑️</button>
          </form>
        </div>
      </td>
    </tr>
  );
}
