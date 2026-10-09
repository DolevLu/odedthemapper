"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useTranslation } from "@/components/i18n/LanguageContext";

const KEY = "share-tip-dismissed-v1";

/** A slim, dismissible strip that tells people they can share a Reel/TikTok/Facebook post straight into Travi. */
export function ShareTipStrip({ className = "" }: { className?: string }) {
  const { t } = useTranslation();
  const [hidden, setHidden] = useState(true); // hidden until localStorage says otherwise (no flash)
  useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setHidden(localStorage.getItem(KEY) === "1");
    } catch {
      setHidden(false);
    }
  }, []);
  if (hidden) return null;
  return (
    <div className={`flex items-center gap-3 rounded-2xl border px-4 py-3 ${className}`} style={{ borderColor: "color-mix(in srgb, var(--primary) 30%, transparent)", background: "color-mix(in srgb, var(--primary) 7%, var(--surface))" }}>
      <span className="text-2xl" aria-hidden="true">
        📲
      </span>
      <div className="min-w-0 flex-1 text-sm">
        <p className="font-extrabold">{t("share.tip.title")}</p>
        <p className="opacity-70">{t("share.tip.body")}</p>
      </div>
      <Link href="/share-target" className="shrink-0 rounded-full px-3 py-1.5 text-xs font-bold text-white" style={{ background: "var(--primary)" }}>
        {t("share.tip.cta")}
      </Link>
      <button
        onClick={() => {
          setHidden(true);
          try {
            localStorage.setItem(KEY, "1");
          } catch {}
        }}
        className="shrink-0 text-lg opacity-40 hover:opacity-100"
        aria-label={t("share.tip.dismiss")}
      >
        ✕
      </button>
    </div>
  );
}
