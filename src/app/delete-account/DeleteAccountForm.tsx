"use client";

import { useState, useTransition } from "react";
import { signOut } from "next-auth/react";
import { deleteMyAccount } from "@/lib/actions/account";

export function DeleteAccountForm({ email }: { email: string }) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmEmail, setConfirmEmail] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleDelete() {
    setError(null);
    startTransition(async () => {
      const res = await deleteMyAccount(confirmEmail);
      if (res?.error) {
        setError(res.error);
        return;
      }
      await signOut({ callbackUrl: "/" });
    });
  }

  return (
    <>
      <button
        onClick={() => setConfirmOpen(true)}
        className="rounded-full bg-red-600 px-6 py-3 text-sm font-bold text-white hover:bg-red-700"
      >
        🗑️ מחיקת החשבון שלי לצמיתות
      </button>

      {confirmOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-6" onClick={() => setConfirmOpen(false)}>
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-xl">
            <span className="text-3xl">⚠️</span>
            <h2 className="mt-2 text-lg font-bold">בטוחים לגמרי?</h2>
            <p className="mt-2 text-sm opacity-70">פעולה זו בלתי הפיכה. כדי לאשר, הקלידו את כתובת האימייל של החשבון: {email}</p>
            <input
              value={confirmEmail}
              onChange={(e) => setConfirmEmail(e.target.value)}
              placeholder={email}
              dir="ltr"
              className="mt-3 w-full rounded-lg border border-black/15 px-3 py-2 text-center text-sm"
            />
            {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
            <div className="mt-5 flex gap-2">
              <button
                onClick={() => setConfirmOpen(false)}
                className="flex-1 rounded-full border border-black/10 px-4 py-2.5 text-sm font-semibold"
              >
                ביטול
              </button>
              <button
                onClick={handleDelete}
                disabled={pending || confirmEmail.trim().toLowerCase() !== email.toLowerCase()}
                className="flex-1 rounded-full bg-red-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-40"
              >
                {pending ? "מוחק..." : "מחיקה סופית"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
