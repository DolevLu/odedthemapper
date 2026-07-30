"use client";

const TYPE_META: Record<string, { label: string; icon: string; color: string }> = {
  flight: { label: "טיסה", icon: "✈️", color: "#3E5C76" },
  hotel: { label: "מלון", icon: "🏨", color: "#B5502A" },
  ticket: { label: "כרטיס", icon: "🎫", color: "#8A5CF6" },
  passport: { label: "דרכון", icon: "🛂", color: "#1E5B5A" },
  visa: { label: "ויזה", icon: "📋", color: "#9C6B30" },
  insurance: { label: "ביטוח נסיעות", icon: "🛡️", color: "#0E7C7B" },
  vaccination: { label: "חיסון", icon: "💉", color: "#B23A48" },
  other: { label: "אחר", icon: "📄", color: "#6B7280" },
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
  const meta = TYPE_META[item.type] ?? TYPE_META.other;

  return (
    <div className="flex overflow-hidden shadow-sm" style={{ borderRadius: "var(--radius)" }}>
      {/* Stub */}
      <div
        className="relative flex w-20 shrink-0 flex-col items-center justify-center gap-1 p-2 text-center text-white"
        style={{ background: meta.color }}
      >
        <span className="text-2xl">{meta.icon}</span>
        <span className="text-[10px] font-semibold leading-tight">{meta.label}</span>
      </div>

      {/* Perforated divider */}
      <div className="relative w-0 shrink-0" style={{ borderInlineStart: "2px dashed rgba(255,255,255,0.6)" }}>
        <span className="absolute -top-2 -start-2 h-4 w-4 rounded-full" style={{ background: "var(--background)" }} />
        <span className="absolute -bottom-2 -start-2 h-4 w-4 rounded-full" style={{ background: "var(--background)" }} />
      </div>

      {/* Main details */}
      <div className="flex flex-1 items-start justify-between gap-3 p-3" style={{ background: "var(--surface)" }}>
        <div className="flex min-w-0 gap-3">
          {item.imageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={item.imageUrl} alt="" className="h-14 w-14 shrink-0 rounded-lg object-cover" />
          )}
          <div className="min-w-0">
            <p className="truncate font-bold">{item.title}</p>
            {item.confirmationNumber && (
              <p className="text-xs opacity-70">
                קוד הזמנה: <span className="font-mono">{item.confirmationNumber}</span>
              </p>
            )}
            {item.dateRange && <p className="text-xs opacity-70">{item.dateRange}</p>}
            {item.notes && <p className="text-xs opacity-70">{item.notes}</p>}
            {item.address && (
              <p className="text-xs opacity-60">
                📍 {item.address} {item.hasMapPin ? "· מסומן על המפה" : ""}
              </p>
            )}
          </div>
        </div>
        <button onClick={onDelete} className="shrink-0 text-xs opacity-50 underline hover:opacity-100">
          מחיקה
        </button>
      </div>
    </div>
  );
}

export { TYPE_META };
