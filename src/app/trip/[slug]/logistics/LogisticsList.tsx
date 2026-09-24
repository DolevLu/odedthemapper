"use client";

import { useState } from "react";
import { deleteLogistic } from "@/lib/actions/trip";
import { LogisticTicketCard, TYPE_META, type LogisticItem } from "./LogisticTicketCard";
import { useTranslation } from "@/components/i18n/LanguageContext";

export function LogisticsList({ items, slug }: { items: LogisticItem[]; slug: string }) {
  const [filter, setFilter] = useState<string | null>(null);
  const { t, lang } = useTranslation();
  const typesPresent = Array.from(new Set(items.map((i) => i.type)));
  const filtered = filter ? items.filter((i) => i.type === filter) : items;

  if (items.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed px-6 py-10 text-center" style={{ borderColor: "color-mix(in srgb, var(--primary) 30%, transparent)" }}>
        <p className="text-4xl">🎫</p>
        <p className="mt-2 text-sm opacity-60">{t("logistics.empty")}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {typesPresent.length > 1 && (
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
          <Chip color="var(--primary)" active={filter === null} onClick={() => setFilter(null)}>
            {t("logistics.all")} ({items.length})
          </Chip>
          {typesPresent.map((type) => {
            const meta = TYPE_META[type] ?? TYPE_META.other;
            const count = items.filter((i) => i.type === type).length;
            return (
              <Chip key={type} color={meta.color} active={filter === type} onClick={() => setFilter(type)}>
                {meta.icon} {meta.label[lang]} ({count})
              </Chip>
            );
          })}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map((item) => (
          <LogisticTicketCard key={item.id} item={item} onDelete={() => deleteLogistic(item.id, slug)} />
        ))}
      </div>
    </div>
  );
}

function Chip({ color, active, onClick, children }: { color: string; active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors"
      style={{ background: active ? color : `color-mix(in srgb, ${color} 12%, transparent)`, color: active ? "white" : color }}
    >
      {children}
    </button>
  );
}
