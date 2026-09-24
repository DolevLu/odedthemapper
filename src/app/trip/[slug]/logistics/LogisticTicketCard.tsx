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

/** A booking as a real ticket: coloured header with what it is and when, the uploaded picture as the body of the
 * card (tap to open it full size), then the confirmation code and details under a perforated line. */
export function LogisticTicketCard({ item, onDelete }: { item: LogisticItem; onDelete: () => void }) {
  const { t, lang } = useTranslation();
  const meta = TYPE_META[item.type] ?? TYPE_META.other;
  const isPdf = item.imageUrl?.toLowerCase().endsWith(".pdf") ?? false;

  return (
    <article className="game-pop-in flex flex-col overflow-hidden shadow-md" style={{ borderRadius: "calc(var(--radius) + 6px)", background: "var(--surface)" }}>
      <header className="flex items-center justify-between gap-2 px-4 py-2.5 text-white" style={{ background: `linear-gradient(135deg, ${meta.color}, color-mix(in srgb, ${meta.color} 70%, #000))` }}>
        <span className="flex items-center gap-2 text-sm font-bold">
          <span className="text-lg" aria-hidden>
            {meta.icon}
          </span>
          {meta.label[lang]}
        </span>
        {item.dateRange && <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-xs font-semibold">{item.dateRange}</span>}
      </header>

      {item.imageUrl && !isPdf && (
        <a href={item.imageUrl} target="_blank" rel="noreferrer" className="block bg-black/5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={item.imageUrl} alt={item.title} className="h-44 w-full object-cover" loading="lazy" />
        </a>
      )}
      {item.imageUrl && isPdf && (
        <a
          href={item.imageUrl}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-3 px-4 py-3 text-sm font-semibold"
          style={{ background: `color-mix(in srgb, ${meta.color} 10%, transparent)`, color: meta.color }}
        >
          <span className="text-2xl">📄</span>
          PDF
        </a>
      )}

      {/* perforation */}
      <div className="relative my-0.5 h-0 border-t-2 border-dashed" style={{ borderColor: "color-mix(in srgb, var(--text) 18%, transparent)" }}>
        <span className="absolute -start-2 -top-2.5 h-5 w-5 rounded-full" style={{ background: "var(--background)" }} />
        <span className="absolute -end-2 -top-2.5 h-5 w-5 rounded-full" style={{ background: "var(--background)" }} />
      </div>

      <div className="flex flex-col gap-2 px-4 pb-3.5 pt-2.5">
        <h3 className="text-base font-extrabold leading-snug">{item.title}</h3>
        {item.confirmationNumber && (
          <div className="flex items-center gap-2 text-xs">
            <span className="opacity-60">{t("logistics.confirmationCode")}</span>
            <span className="rounded-md px-2 py-0.5 font-mono text-sm font-bold tracking-wide" style={{ background: `color-mix(in srgb, ${meta.color} 14%, transparent)`, color: meta.color }}>
              {item.confirmationNumber}
            </span>
          </div>
        )}
        {item.notes && <p className="text-sm opacity-75">{item.notes}</p>}
        {item.address && (
          <p className="text-xs opacity-60">
            📍 {item.address} {item.hasMapPin ? t("logistics.markedOnMap") : ""}
          </p>
        )}
        <div className="flex justify-end">
          <button
            onClick={() => {
              if (window.confirm(t("logistics.delete") + "?")) onDelete();
            }}
            className="text-xs opacity-45 hover:opacity-100"
          >
            🗑 {t("logistics.delete")}
          </button>
        </div>
      </div>
    </article>
  );
}

export { TYPE_META };
