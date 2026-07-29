"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const TYPE_EMOJI: Record<string, string> = {
  flight: "✈️",
  hotel: "🏨",
  ticket: "🎫",
  passport: "🛂",
  visa: "📋",
  insurance: "🛡️",
  vaccination: "💉",
  other: "📄",
};

function bucketFor(hoursUntil: number): { key: string; label: string } | null {
  if (hoursUntil <= 1) return { key: "1h", label: "בעוד פחות משעה" };
  if (hoursUntil <= 24) return { key: "1d", label: "מחר" };
  if (hoursUntil <= 24 * 7) return { key: "7d", label: "השבוע" };
  return null;
}

export function UpcomingReminderToast({
  item,
}: {
  item: { id: string; type: string; title: string; startsAt: string; slug: string } | null;
}) {
  const [visible, setVisible] = useState(false);
  const [bucket, setBucket] = useState<{ key: string; label: string } | null>(null);

  useEffect(() => {
    if (!item) return;
    const hoursUntil = (new Date(item.startsAt).getTime() - Date.now()) / (1000 * 60 * 60);
    if (hoursUntil < 0) return;
    const b = bucketFor(hoursUntil);
    if (!b) return;

    const dismissKey = `reminder-seen-${item.id}-${b.key}`;
    if (sessionStorage.getItem(dismissKey)) return;

    setBucket(b);
    setVisible(true);
    const timer = setTimeout(() => setVisible(false), 5000);
    return () => clearTimeout(timer);
  }, [item]);

  function dismiss() {
    if (item && bucket) sessionStorage.setItem(`reminder-seen-${item.id}-${bucket.key}`, "1");
    setVisible(false);
  }

  if (!item || !visible || !bucket) return null;

  return (
    <div className="fixed bottom-4 start-4 z-[200] flex max-w-xs items-start gap-3 rounded-2xl bg-white p-4 shadow-xl border border-black/10">
      <span className="text-2xl">{TYPE_EMOJI[item.type] ?? "📄"}</span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold">{item.title}</p>
        <p className="text-xs opacity-70">מתקרב {bucket.label}</p>
        <Link href={`/trip/${item.slug}/logistics`} className="mt-1 inline-block text-xs font-semibold underline">
          לפרטים
        </Link>
      </div>
      <button onClick={dismiss} className="shrink-0 text-sm opacity-50 hover:opacity-100">
        ✕
      </button>
    </div>
  );
}
