"use client";

import { useState, useTransition } from "react";
import { sendPriceQuote, deletePriceQuote, updateLeadStatus, createQuickLead, updateLeadDetails } from "@/lib/actions/quotes";

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
  basePrice: number;
  costPrice: number;
  currency: string;
  revenueLabel: string;
  profitLabel: string;
  status: string;
  leadStatus: string;
  shareToken: string | null;
  signed: boolean;
};

export function LeadsTable({ leads, slug, destinationId }: { leads: Lead[]; slug: string; destinationId: string }) {
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
          <QuickAddRow slug={slug} destinationId={destinationId} />
        </tbody>
      </table>
      {leads.length === 0 && (
        <p className="border-t p-3 text-sm opacity-60" style={{ borderColor: "color-mix(in srgb, var(--primary) 15%, transparent)" }}>
          עדיין לא נוצרו לידים ליעד הזה - הוסיפו ליד מהיר למטה, או השתמשו בטופס למעלה להצעת מחיר מלאה.
        </p>
      )}
    </div>
  );
}

/** A spreadsheet-style "add a row" — just a client name, so a lead can be
 * logged the moment you hear about it, without stopping to fill in pricing
 * (that can be edited inline right in the table afterwards). */
function QuickAddRow({ slug, destinationId }: { slug: string; destinationId: string }) {
  const [name, setName] = useState("");
  const [, startTransition] = useTransition();

  function submit() {
    const trimmed = name.trim();
    if (!trimmed) return;
    setName("");
    startTransition(() => {
      createQuickLead(destinationId, slug, trimmed);
    });
  }

  return (
    <tr className="border-t" style={{ borderColor: "color-mix(in srgb, var(--primary) 15%, transparent)" }}>
      <td className="p-3" colSpan={7}>
        <div className="flex items-center gap-2">
          <span className="text-base opacity-50">➕</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") submit();
            }}
            placeholder="שם לקוח חדש - הוספת שורת ליד מהירה..."
            className="flex-1 rounded-lg border border-dashed bg-transparent px-3 py-1.5 text-sm"
            style={{ borderColor: "color-mix(in srgb, var(--primary) 40%, transparent)" }}
          />
          <button
            onClick={submit}
            disabled={!name.trim()}
            className="shrink-0 rounded-full px-4 py-1.5 text-xs font-semibold text-white disabled:opacity-40"
            style={{ background: "var(--primary)" }}
          >
            הוספת ליד
          </button>
        </div>
      </td>
    </tr>
  );
}

/** Blur-to-save inline edit, matching how a spreadsheet cell behaves —
 * no separate "edit mode" toggle needed. */
function EditableCell({
  value,
  onSave,
  type = "text",
  className = "",
  width,
}: {
  value: string | number;
  onSave: (next: string) => void;
  type?: "text" | "number";
  className?: string;
  width?: string;
}) {
  const [draft, setDraft] = useState(String(value));

  return (
    <input
      type={type}
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => {
        if (draft !== String(value) && draft.trim() !== "") onSave(draft);
        else setDraft(String(value));
      }}
      className={`rounded border border-transparent bg-transparent px-1 py-0.5 hover:border-black/10 focus:border-black/20 focus:bg-white/60 focus:outline-none ${className}`}
      style={{ width }}
      min={type === "number" ? 0 : undefined}
    />
  );
}

function LeadRow({ lead, slug }: { lead: Lead; slug: string }) {
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [, startTransition] = useTransition();
  const status = STATUS_LABEL[lead.status] ?? STATUS_LABEL.draft;
  const url = lead.shareToken && typeof window !== "undefined" ? `${window.location.origin}/share/quote/${lead.shareToken}` : "";

  function saveField(fields: Parameters<typeof updateLeadDetails>[2]) {
    startTransition(() => {
      updateLeadDetails(lead.id, slug, fields);
    });
  }

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
    <tr
      className="group border-t transition-colors duration-150 hover:bg-black/[0.03]"
      style={{ borderColor: "color-mix(in srgb, var(--primary) 15%, transparent)" }}
    >
      <td className="p-3 font-semibold">
        <EditableCell value={lead.clientName} onSave={(v) => saveField({ clientName: v })} width="9rem" />
        {lead.signed && (
          <span className="ms-1.5 text-xs" title="נחתם">
            ✍️
          </span>
        )}
      </td>
      <td className="p-3 opacity-70">
        <EditableCell type="number" value={lead.tripDays} onSave={(v) => saveField({ tripDays: Number(v) })} width="3.5rem" />
      </td>
      <td className="p-3 opacity-70">
        <span className="inline-flex items-center gap-1">
          <EditableCell type="number" value={lead.basePrice} onSave={(v) => saveField({ basePrice: Number(v) })} width="4.5rem" />
          {lead.currency}
        </span>
      </td>
      <td className="p-3 font-semibold" style={{ color: "var(--primary)" }} title="ערכו את מחיר תכנון המסלול/העלות לעדכון הרווח">
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
        <span
          className="inline-block rounded-full px-2.5 py-1 text-xs font-semibold text-white transition-transform duration-200 group-hover:scale-105"
          style={{ background: status.color }}
        >
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
              disabled={loading || lead.basePrice <= 0}
              title={lead.basePrice <= 0 ? "הוסיפו מחיר תכנון לפני שליחת הצעה" : undefined}
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
