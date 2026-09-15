"use client";

import { useState, useTransition } from "react";
import { sendPriceQuote, deletePriceQuote, updateLeadStatus, createQuickLead, updateLeadDetails } from "@/lib/actions/quotes";
import { useTranslation } from "@/components/i18n/LanguageContext";
import type { DictionaryKey } from "@/lib/i18n/dictionary";

const STATUS_LABEL: Record<string, { labelKey: DictionaryKey; color: string }> = {
  draft: { labelKey: "quotes.status.draft", color: "#6B7280" },
  sent: { labelKey: "quotes.status.sent", color: "#2563EB" },
  accepted: { labelKey: "quotes.status.accepted", color: "#16A34A" },
};

const LEAD_STATUS_OPTIONS: { value: string; labelKey: DictionaryKey }[] = [
  { value: "lead", labelKey: "quotes.leadStatus.lead" },
  { value: "quoted", labelKey: "quotes.leadStatus.quoted" },
  { value: "planning", labelKey: "quotes.leadStatus.planning" },
  { value: "closed_won", labelKey: "quotes.leadStatus.closedWon" },
  { value: "closed_lost", labelKey: "quotes.leadStatus.closedLost" },
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
  const { t } = useTranslation();
  return (
    <div className="overflow-x-auto border" style={{ borderRadius: "var(--radius)", borderColor: "var(--primary)" }}>
      <table className="w-full min-w-[720px] border-collapse text-sm">
        <thead>
          <tr style={{ background: "color-mix(in srgb, var(--primary) 10%, transparent)" }}>
            <th className="p-3 text-start font-semibold">{t("quotes.table.client")}</th>
            <th className="p-3 text-start font-semibold">{t("quotes.table.days")}</th>
            <th className="p-3 text-start font-semibold">{t("quotes.table.revenue")}</th>
            <th className="p-3 text-start font-semibold">{t("quotes.table.profit")}</th>
            <th className="p-3 text-start font-semibold">{t("quotes.table.leadStatus")}</th>
            <th className="p-3 text-start font-semibold">{t("quotes.table.document")}</th>
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
          {t("quotes.emptyState")}
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
  const { t } = useTranslation();

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
            placeholder={t("quotes.newClientPlaceholder")}
            className="flex-1 rounded-lg border border-dashed bg-transparent px-3 py-1.5 text-sm"
            style={{ borderColor: "color-mix(in srgb, var(--primary) 40%, transparent)" }}
          />
          <button
            onClick={submit}
            disabled={!name.trim()}
            className="shrink-0 rounded-full px-4 py-1.5 text-xs font-semibold text-white disabled:opacity-40"
            style={{ background: "var(--primary)" }}
          >
            {t("quotes.addLead")}
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
  const { t } = useTranslation();
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
          <span className="ms-1.5 text-xs" title={t("quotes.signedTitle")}>
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
      <td className="p-3 font-semibold" style={{ color: "var(--primary)" }} title={t("quotes.profitEditHint")}>
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
              {t(o.labelKey)}
            </option>
          ))}
        </select>
      </td>
      <td className="p-3">
        <span
          className="inline-block rounded-full px-2.5 py-1 text-xs font-semibold text-white transition-transform duration-200 group-hover:scale-105"
          style={{ background: status.color }}
        >
          {t(status.labelKey)}
        </span>
      </td>
      <td className="p-3">
        <div className="flex flex-wrap items-center gap-1.5">
          {lead.shareToken ? (
            <button onClick={copy} className="rounded-full border px-2.5 py-1 text-xs font-semibold" style={{ borderColor: "var(--primary)", color: "var(--primary)" }}>
              {copied ? t("quotes.copied") : t("quotes.copyLink")}
            </button>
          ) : (
            <button
              onClick={handleSend}
              disabled={loading || lead.basePrice <= 0}
              title={lead.basePrice <= 0 ? t("quotes.addPriceBeforeSending") : undefined}
              className="rounded-full border px-2.5 py-1 text-xs font-semibold disabled:opacity-50"
              style={{ borderColor: "var(--primary)", color: "var(--primary)" }}
            >
              {loading ? t("quotes.creating") : t("quotes.send")}
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
