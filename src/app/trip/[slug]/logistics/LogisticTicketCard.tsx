"use client";

import { useTranslation } from "@/components/i18n/LanguageContext";

const TYPE_META: Record<string, { label: { he: string; en: string }; icon: string; color: string }> = {
  flight: { label: { he: "טיסה", en: "Flight" }, icon: "✈️", color: "#3E5C76" },
  hotel: { label: { he: "מלון", en: "Hotel" }, icon: "🏨", color: "#B5502A" },
  ticket: { label: { he: "כרטיס", en: "Ticket" }, icon: "🎫", color: "#8A5CF6" },
  passport: { label: { he: "דרכון", en: "Passport" }, icon: "🛂", color: "#1E5B5A" },
  visa: { label: { he: "ויזה", en: "Visa" }, icon: "📋", color: "#9C6B30" },
  insurance: { label: { he: "ביטוח נסיעות", en: "Travel insurance" }, icon: "🛡️", color: "#0E7C7B" },
  vaccination: { label: { he: "חיסון", en: "Vaccination" }, icon: "💉", color: "#B23A48" },
  other: { label: { he: "אחר", en: "Other" }, icon: "📄", color: "#6B7280" },
};

export type LogisticItem = {
  id: string;
  type: string;
  title: string;
  notes: string;
  confirmationNumber: string | null;
  dateRange: string | null;
  address: string | null;
  hasMapPin: boolean;
  imageUrl: string | null;
};

export function LogisticTicketCard({ item, onDelete }: { item: LogisticItem; onDelete: () => void }) {
  const { t, lang } = useTranslation();
  const meta = TYPE_META[item.type] ?? TYPE_META.other;
  const isPdf = item.imageUrl?.toLowerCase().endsWith(".pdf") ?? false;

  return (
    <div
      className="game-pop-in group flex overflow-hidden shadow-sm transition-transform duration-200 hover:-translate-y-0.5 hover:rotate-[-0.3deg] hover:shadow-md"
      style={{ borderRadius: "var(--radius)" }}
    >
      {/* Stub */}
      <div
        className="relative flex w-20 shrink-0 flex-col items-center justify-center gap-1 p-2 text-center text-white"
        style={{ background: meta.color }}
      >
        <span className="inline-block text-2xl transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6">{meta.icon}</span>
        <span className="text-[10px] font-semibold leading-tight">{meta.label[lang]}</span>
      </div>

      {/* Perforated divider */}
      <div className="relative w-0 shrink-0" style={{ borderInlineStart: "2px dashed rgba(255,255,255,0.6)" }}>
        <span className="absolute -top-2 -start-2 h-4 w-4 rounded-full" style={{ background: "var(--background)" }} />
        <span className="absolute -bottom-2 -start-2 h-4 w-4 rounded-full" style={{ background: "var(--background)" }} />
      </div>

      {/* Main details */}
      <div className="flex flex-1 items-start justify-between gap-3 p-3" style={{ background: "var(--surface)" }}>
        <div className="flex min-w-0 gap-3">
          {item.imageUrl && isPdf && (
            <a
              href={item.imageUrl}
              target="_blank"
              rel="noreferrer"
              className="flex h-14 w-14 shrink-0 flex-col items-center justify-center gap-0.5 rounded-lg text-xs font-semibold"
              style={{ background: "color-mix(in srgb, var(--primary) 12%, transparent)", color: "var(--primary)" }}
            >
              <span className="text-lg">📄</span>
              PDF
            </a>
          )}
          {item.imageUrl && !isPdf && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={item.imageUrl} alt="" className="h-14 w-14 shrink-0 rounded-lg object-cover" />
          )}
          <div className="min-w-0">
            <p className="truncate font-bold">{item.title}</p>
            {item.confirmationNumber && (
              <p className="text-xs opacity-70">
                {t("logistics.confirmationCode")} <span className="font-mono">{item.confirmationNumber}</span>
              </p>
            )}
            {item.dateRange && <p className="text-xs opacity-70">{item.dateRange}</p>}
            {item.notes && <p className="text-xs opacity-70">{item.notes}</p>}
            {item.address && (
              <p className="text-xs opacity-60">
                📍 {item.address} {item.hasMapPin ? t("logistics.markedOnMap") : ""}
              </p>
            )}
          </div>
        </div>
        <button onClick={onDelete} className="shrink-0 text-xs opacity-50 underline hover:opacity-100">
          {t("logistics.delete")}
        </button>
      </div>
    </div>
  );
}

export { TYPE_META };
