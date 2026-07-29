"use client";

import { useState, useTransition } from "react";
import { inviteSubscriptionMember, removeSubscriptionMember } from "@/lib/actions/subscription";

export function MemberManager({
  subscriptionId,
  members,
  seats,
  ownerEmail,
}: {
  subscriptionId: string;
  members: { id: string; invitedEmail: string }[];
  seats: number | null;
  ownerEmail: string;
}) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const seatsUsed = 1 + members.length;
  const seatsLabel = seats === null ? "ללא הגבלה" : `${seatsUsed} מתוך ${seats}`;
  const canInvite = seats === null || seatsUsed < seats;

  function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const formData = new FormData();
    formData.set("email", email);
    startTransition(async () => {
      const res = await inviteSubscriptionMember(subscriptionId, formData);
      if (res?.error) setError(res.error);
      else setEmail("");
    });
  }

  return (
    <div className="mt-6 border-t border-black/5 pt-6">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold">משתמשים במנוי</p>
        <span className="text-xs opacity-60">{seatsLabel}</span>
      </div>

      <div className="mt-3 flex flex-col gap-2">
        <div className="flex items-center justify-between rounded-xl bg-black/[0.03] px-3 py-2 text-sm">
          <span>{ownerEmail}</span>
          <span className="text-xs opacity-50">בעל/ת המנוי</span>
        </div>
        {members.map((m) => (
          <div key={m.id} className="flex items-center justify-between rounded-xl bg-black/[0.03] px-3 py-2 text-sm">
            <span>{m.invitedEmail}</span>
            <button
              onClick={() => startTransition(() => removeSubscriptionMember(m.id))}
              className="text-xs opacity-50 underline hover:opacity-100"
            >
              הסרה
            </button>
          </div>
        ))}
      </div>

      {canInvite ? (
        <form onSubmit={handleInvite} className="mt-4 flex flex-wrap gap-2">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="אימייל להזמנה"
            className="flex-1 rounded-full border border-black/10 px-4 py-2 text-sm"
          />
          <button
            type="submit"
            disabled={pending}
            className="rounded-full px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            style={{ background: "linear-gradient(135deg, #7C3AED, #EC4899)" }}
          >
            {pending ? "מזמין..." : "הזמנה"}
          </button>
        </form>
      ) : (
        <p className="mt-4 text-xs opacity-60">הגעתם למספר המשתמשים המקסימלי בתוכנית זו.</p>
      )}
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </div>
  );
}
