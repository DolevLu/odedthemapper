"use client";

import { useRef, useState, useTransition } from "react";
import { createPromoCode } from "@/lib/actions/adminPromoCodes";

export function CreatePromoCodeForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await createPromoCode(formData);
      if (result?.error) {
        setError(result.error);
        return;
      }
      formRef.current?.reset();
    });
  }

  return (
    <form ref={formRef} action={handleSubmit} className="mb-8 grid grid-cols-1 gap-3 rounded-xl border border-black/10 bg-white p-4 sm:grid-cols-2">
      <label className="text-sm font-medium">
        קוד
        <input name="code" required placeholder="למשל INFLUENCER20" className="mt-1 block w-full rounded-lg border border-black/10 px-3 py-2 font-normal" />
      </label>
      <label className="text-sm font-medium">
        אחוז הנחה
        <input name="discountPercent" type="number" min={1} max={100} required placeholder="20" className="mt-1 block w-full rounded-lg border border-black/10 px-3 py-2 font-normal" />
      </label>
      <label className="text-sm font-medium">
        שם השותף/קמפיין (אופציונלי)
        <input name="partnerName" placeholder="למשל שם המשפיען" className="mt-1 block w-full rounded-lg border border-black/10 px-3 py-2 font-normal" />
      </label>
      <label className="text-sm font-medium">
        מקסימום שימושים (אופציונלי)
        <input name="maxUses" type="number" min={1} placeholder="ללא הגבלה" className="mt-1 block w-full rounded-lg border border-black/10 px-3 py-2 font-normal" />
      </label>
      <label className="text-sm font-medium">
        תאריך תפוגה (אופציונלי)
        <input name="expiresAt" type="date" className="mt-1 block w-full rounded-lg border border-black/10 px-3 py-2 font-normal" />
      </label>
      <div className="flex items-end gap-3">
        <button type="submit" disabled={pending} className="rounded-lg bg-black px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
          {pending ? "יוצר..." : "+ יצירת קוד"}
        </button>
        {error && <span className="text-sm text-red-600">{error}</span>}
      </div>
    </form>
  );
}
