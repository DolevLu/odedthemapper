"use client";

import { useState } from "react";
import { createPriceQuote } from "@/lib/actions/quotes";

export function NewQuoteForm({ destinationId, slug }: { destinationId: string; slug: string }) {
  const [includesBooking, setIncludesBooking] = useState(false);
  const action = createPriceQuote.bind(null, destinationId, slug);

  return (
    <form
      action={action}
      className="flex flex-col gap-3 border p-4"
      style={{ borderRadius: "var(--radius)", borderColor: "var(--primary)", background: "var(--surface)" }}
    >
      <h2 className="font-bold">➕ הצעת מחיר חדשה</h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <input name="clientName" required placeholder="שם הלקוח" className="rounded-lg border px-3 py-2" style={{ borderColor: "var(--primary)" }} />
        <label className="text-xs opacity-60">
          מספר ימי טיול
          <input name="tripDays" type="number" min="1" defaultValue={3} className="mt-1 block w-full rounded-lg border px-3 py-2" style={{ borderColor: "var(--primary)" }} />
        </label>
        <label className="text-xs opacity-60">
          מחיר תכנון המסלול ($)
          <input name="basePrice" type="number" min="0" step="1" required className="mt-1 block w-full rounded-lg border px-3 py-2" style={{ borderColor: "var(--primary)" }} />
        </label>
        <label className="text-xs opacity-60">
          עלות לכם (לחישוב רווח, לא מוצג ללקוח) ($)
          <input name="costPrice" type="number" min="0" step="1" defaultValue={0} className="mt-1 block w-full rounded-lg border px-3 py-2" style={{ borderColor: "var(--primary)" }} />
        </label>
        <label className="flex items-center gap-2 self-end text-sm">
          <input type="checkbox" name="includesBooking" checked={includesBooking} onChange={(e) => setIncludesBooking(e.target.checked)} />
          גם ביצוע הזמנות (אטרקציות / טיסות / מלונות)
        </label>
        {includesBooking && (
          <label className="text-xs opacity-60 sm:col-span-2">
            תוספת מחיר עבור ביצוע ההזמנות ($)
            <input name="bookingPrice" type="number" min="0" step="1" className="mt-1 block w-full rounded-lg border px-3 py-2" style={{ borderColor: "var(--primary)" }} />
          </label>
        )}
        <label className="text-xs opacity-60 sm:col-span-2">
          הערות נוספות (יופיעו במסמך)
          <textarea name="notes" rows={2} className="mt-1 block w-full rounded-lg border px-3 py-2" style={{ borderColor: "var(--primary)" }} />
        </label>
      </div>
      <button type="submit" className="self-start rounded-full px-5 py-2.5 text-sm font-semibold text-white" style={{ background: "var(--primary)" }}>
        יצירת הצעת מחיר
      </button>
    </form>
  );
}
