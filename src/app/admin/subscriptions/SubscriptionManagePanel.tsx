"use client";

import { useState, useTransition } from "react";
import {
  toggleSubscriptionDestination,
  updateSubscriptionStatus,
  extendSubscriptionPeriod,
  deleteSubscription,
} from "@/lib/actions/adminSubscriptions";

type DestOption = { id: string; name: string };

export function SubscriptionManagePanel({
  subscriptionId,
  isOrgTier,
  status,
  currentPeriodEnd,
  currentDestinationIds,
  allDestinations,
}: {
  subscriptionId: string;
  isOrgTier: boolean;
  status: string;
  currentPeriodEnd: string; // ISO date, yyyy-mm-dd
  currentDestinationIds: string[];
  allDestinations: DestOption[];
}) {
  const [open, setOpen] = useState(false);
  const [periodInput, setPeriodInput] = useState(currentPeriodEnd);
  const [, startTransition] = useTransition();

  function handleDelete() {
    if (!window.confirm("להסיר את הגישה הזו לגמרי? הפעולה בלתי הפיכה.")) return;
    startTransition(() => deleteSubscription(subscriptionId));
  }

  return (
    <>
      <button onClick={() => setOpen((v) => !v)} className="text-xs font-medium underline opacity-70 hover:opacity-100">
        {open ? "סגירה" : "ניהול"}
      </button>
      {open && (
        <div className="mt-2 flex flex-col gap-3 rounded-lg border border-black/10 bg-black/[0.02] p-3 text-xs">
          {!isOrgTier && (
            <div>
              <p className="mb-1 font-semibold opacity-70">יעדים</p>
              <div className="flex flex-wrap gap-1.5">
                {allDestinations.map((d) => {
                  const checked = currentDestinationIds.includes(d.id);
                  return (
                    <button
                      key={d.id}
                      onClick={() => startTransition(() => toggleSubscriptionDestination(subscriptionId, d.id, !checked))}
                      className="rounded-full border px-2 py-0.5"
                      style={{ borderColor: checked ? "#7C3AED" : "#0000001a", background: checked ? "#7C3AED" : "white", color: checked ? "white" : "black" }}
                    >
                      {checked ? "✓ " : ""}
                      {d.name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-1.5">
              <span className="font-semibold opacity-70">סטטוס</span>
              <select
                defaultValue={status}
                onChange={(e) => startTransition(() => updateSubscriptionStatus(subscriptionId, e.target.value as "active" | "canceled" | "pending"))}
                className="rounded border border-black/10 px-1.5 py-1"
              >
                <option value="active">active</option>
                <option value="pending">pending</option>
                <option value="canceled">canceled</option>
              </select>
            </label>

            <label className="flex items-center gap-1.5">
              <span className="font-semibold opacity-70">בתוקף עד</span>
              <input type="date" value={periodInput} onChange={(e) => setPeriodInput(e.target.value)} className="rounded border border-black/10 px-1.5 py-1" />
              <button
                onClick={() => startTransition(() => extendSubscriptionPeriod(subscriptionId, periodInput))}
                className="rounded bg-black px-2 py-1 font-semibold text-white"
              >
                שמירה
              </button>
            </label>

            <button onClick={handleDelete} className="mr-auto rounded bg-red-600 px-2 py-1 font-semibold text-white">
              הסרת גישה לגמרי
            </button>
          </div>
        </div>
      )}
    </>
  );
}
