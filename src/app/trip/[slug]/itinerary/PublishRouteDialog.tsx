"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { useTranslation } from "@/components/i18n/LanguageContext";
import { setRoutePublic } from "@/lib/actions/publicRoutes";
import { AUDIENCES, AUDIENCE_ICON, type Audience } from "@/lib/publicRoutes";
import type { DictionaryKey } from "@/lib/i18n/dictionary";

/** Chips for "who is it for" + optional description - shared by the Save button (publish while saving) and the
 * saved-routes list (publish / edit / unpublish a route saved earlier). Categories, days, stops and the cover photo
 * are computed automatically on the server. */
export function PublishFields({
  audience,
  onAudience,
  description,
  onDescription,
}: {
  audience: Audience[];
  onAudience: (a: Audience[]) => void;
  description: string;
  onDescription: (d: string) => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs font-bold opacity-70">{t("pub.share.for")}</p>
      <div className="flex flex-wrap gap-1.5">
        {AUDIENCES.map((a) => {
          const on = audience.includes(a);
          return (
            <button
              key={a}
              type="button"
              onClick={() => onAudience(on ? audience.filter((x) => x !== a) : [...audience, a])}
              className="rounded-full border px-2.5 py-1 text-xs font-semibold"
              style={{ borderColor: "var(--primary)", background: on ? "var(--primary)" : "transparent", color: on ? "white" : "var(--text)" }}
            >
              {AUDIENCE_ICON[a]} {t(`pub.aud.${a}` as DictionaryKey)}
            </button>
          );
        })}
      </div>
      <textarea
        value={description}
        onChange={(e) => onDescription(e.target.value.slice(0, 300))}
        rows={2}
        placeholder={t("pub.share.desc")}
        className="w-full rounded-lg border px-2 py-1.5 text-sm"
        style={{ borderColor: "var(--primary)", background: "var(--surface)" }}
      />
      <p className="text-[11px] opacity-50">{t("pub.share.auto")}</p>
    </div>
  );
}

export function publishErrorText(code: string, t: (k: DictionaryKey) => string): string {
  if (code === "too-short") return t("pub.share.tooShort");
  if (code === "quota") return t("pub.share.quota");
  return t("pub.failed");
}

/** Modal for a route that's already saved: publish it, change its sharing settings, or take it down. */
export function PublishRouteDialog({
  templateId,
  slug,
  initial,
  onClose,
}: {
  templateId: string;
  slug: string;
  initial: { name: string; isPublic: boolean; audience: Audience[]; description: string };
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const router = useRouter();
  const [name, setName] = useState(initial.name);
  const [audience, setAudience] = useState<Audience[]>(initial.audience);
  const [description, setDescription] = useState(initial.description);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function save(isPublic: boolean) {
    setBusy(true);
    setMsg(null);
    try {
      const res = await setRoutePublic(templateId, slug, { isPublic, name, audience, description });
      if ("error" in res) setMsg({ ok: false, text: publishErrorText(res.error, t) });
      else {
        setMsg({ ok: true, text: isPublic ? t("pub.share.done") : t("pub.share.removed") });
        router.refresh();
        if (!isPublic) setTimeout(onClose, 900);
      }
    } catch {
      setMsg({ ok: false, text: t("pub.failed") });
    }
    setBusy(false);
  }

  // Portaled to <body>: this dialog is opened from inside the itinerary map's own stacking context, where it would
  // otherwise sit underneath the route drawer no matter its z-index.
  if (typeof document === "undefined") return null;
  return createPortal(
    <div className="fixed inset-0 z-[400] flex items-end justify-center bg-black/40 p-4 sm:items-center" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="flex w-full max-w-sm flex-col gap-3 rounded-2xl p-5 shadow-2xl" style={{ background: "var(--surface)" }}>
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold">🌍 {t("pub.share.title")}</h2>
          <button onClick={onClose} className="text-xl opacity-50 hover:opacity-100" aria-label={t("nav.close")}>
            ✕
          </button>
        </div>
        <label className="flex flex-col gap-1 text-xs font-bold opacity-80">
          {t("pub.share.name")}
          <input value={name} onChange={(e) => setName(e.target.value.slice(0, 60))} className="rounded-lg border px-2 py-1.5 text-sm font-normal" style={{ borderColor: "var(--primary)", background: "var(--surface)" }} />
        </label>
        <PublishFields audience={audience} onAudience={setAudience} description={description} onDescription={setDescription} />
        {msg && (
          <p className={`text-sm font-semibold ${msg.ok ? "text-emerald-600" : "text-red-600"}`} role="status">
            {msg.text}
          </p>
        )}
        <div className="flex gap-2">
          <button onClick={() => save(true)} disabled={busy || name.trim().length < 3} className="flex-1 rounded-full px-4 py-2 text-sm font-bold text-white disabled:opacity-50" style={{ background: "linear-gradient(135deg, #6D28D9, #EC4899)" }}>
            {t("pub.share.save")}
          </button>
          {initial.isPublic && (
            <button onClick={() => save(false)} disabled={busy} className="rounded-full border px-3 py-2 text-xs font-semibold disabled:opacity-50" style={{ borderColor: "rgba(0,0,0,0.2)" }}>
              {t("pub.share.unpublish")}
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
