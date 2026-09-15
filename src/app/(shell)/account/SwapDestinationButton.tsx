"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { swapSubscriptionDestination } from "@/lib/actions/subscription";
import { useTranslation } from "@/components/i18n/LanguageContext";

export function SwapDestinationButton({
  subscriptionId,
  destinationId,
  destinationName,
  remainingDays,
  candidates,
}: {
  subscriptionId: string;
  destinationId: string;
  destinationName: string;
  remainingDays: number;
  candidates: { slug: string; name: string }[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const { t } = useTranslation();

  if (remainingDays > 0) {
    return (
      <span className="text-xs opacity-50">
        {t("account.swap.availableIn")} {remainingDays} {t("account.swap.days")}
      </span>
    );
  }

  function handlePick(slug: string) {
    setError(null);
    startTransition(async () => {
      const res = await swapSubscriptionDestination(subscriptionId, destinationId, slug);
      if (res?.error) {
        setError(res.error);
        return;
      }
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className="text-xs font-semibold underline opacity-70 hover:opacity-100">
        {t("account.swap.button")}
      </button>

      {open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-6" onClick={() => setOpen(false)}>
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl">
            <h2 className="text-sm font-bold">
              {t("account.swap.dialogTitlePrefix")} {destinationName} {t("account.swap.dialogTitleSuffix")}
            </h2>
            <p className="mt-1 text-xs opacity-60">{t("account.swap.note")}</p>
            {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
            <div className="mt-3 flex max-h-64 flex-col gap-1 overflow-y-auto">
              {candidates.map((c) => (
                <button
                  key={c.slug}
                  onClick={() => handlePick(c.slug)}
                  disabled={pending}
                  className="rounded-lg px-3 py-2 text-start text-sm hover:bg-black/5 disabled:opacity-50"
                >
                  {c.name}
                </button>
              ))}
              {candidates.length === 0 && <p className="p-2 text-xs opacity-50">{t("account.swap.noneAvailable")}</p>}
            </div>
            <button onClick={() => setOpen(false)} className="mt-3 text-xs opacity-60 underline">
              {t("account.swap.cancel")}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
