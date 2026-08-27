"use client";

import { useRef, useState, useTransition } from "react";
import { grantComplimentarySubscription } from "@/lib/actions/adminSubscriptions";
import { PLANS, type PlanKey } from "@/lib/plans";

type DestOption = { id: string; name: string };

export function GrantAccessForm({ destinations }: { destinations: DestOption[] }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [planKey, setPlanKey] = useState<PlanKey>("solo");
  const [selectedDest, setSelectedDest] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [pending, startTransition] = useTransition();
  const plan = PLANS[planKey];

  function toggleDest(id: string) {
    setSelectedDest((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (plan.destinationLimit && prev.length >= plan.destinationLimit) return prev;
      return [...prev, id];
    });
  }

  function handleSubmit(formData: FormData) {
    setError(null);
    setSuccess(false);
    startTransition(async () => {
      const result = await grantComplimentarySubscription(formData);
      if (result?.error) {
        setError(result.error);
        return;
      }
      setSuccess(true);
      setSelectedDest([]);
      formRef.current?.reset();
    });
  }

  return (
    <form ref={formRef} action={handleSubmit} className="mb-8 flex flex-col gap-3 rounded-xl border border-black/10 bg-white p-4">
      <h2 className="text-sm font-bold">🎁 מתן גישה ידנית (פינוק / תיקון בעיית גישה)</h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <label className="text-sm font-medium">
          אימייל המשתמש (חייב להיות רשום כבר)
          <input name="email" type="email" required placeholder="user@example.com" className="mt-1 block w-full rounded-lg border border-black/10 px-3 py-2 font-normal" />
        </label>
        <label className="text-sm font-medium">
          תוכנית
          <select name="planKey" value={planKey} onChange={(e) => { setPlanKey(e.target.value as PlanKey); setSelectedDest([]); }} className="mt-1 block w-full rounded-lg border border-black/10 px-3 py-2 font-normal">
            {(Object.keys(PLANS) as PlanKey[]).map((k) => (
              <option key={k} value={k}>{PLANS[k].name}</option>
            ))}
          </select>
        </label>
        <label className="text-sm font-medium">
          לכמה חודשים
          <input name="months" type="number" min={1} defaultValue={1} className="mt-1 block w-full rounded-lg border border-black/10 px-3 py-2 font-normal" />
        </label>
      </div>

      {!plan.isOrgTier && (
        <div>
          <p className="mb-1.5 text-sm font-medium opacity-70">
            יעדים (עד {plan.destinationLimit}) - {selectedDest.length}/{plan.destinationLimit}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {destinations.map((d) => {
              const checked = selectedDest.includes(d.id);
              return (
                <label key={d.id} className="flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs" style={{ borderColor: checked ? "#7C3AED" : "#0000001a", background: checked ? "#FAF5FF" : "white" }}>
                  <input type="checkbox" name="destinationIds" value={d.id} checked={checked} onChange={() => toggleDest(d.id)} className="hidden" />
                  {d.name}
                </label>
              );
            })}
          </div>
        </div>
      )}

      <div className="flex items-center gap-3">
        <button type="submit" disabled={pending} className="w-fit rounded-lg bg-black px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
          {pending ? "מעניק..." : "הענקת גישה"}
        </button>
        {error && <span className="text-sm text-red-600">{error}</span>}
        {success && <span className="text-sm font-semibold text-emerald-600">✓ הגישה הוענקה</span>}
      </div>
    </form>
  );
}
