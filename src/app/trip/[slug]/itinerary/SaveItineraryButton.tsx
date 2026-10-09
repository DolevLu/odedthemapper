"use client";

import { useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { saveItineraryAsTemplate } from "@/lib/actions/trip";
import { setRoutePublic } from "@/lib/actions/publicRoutes";
import { PublishFields, publishErrorText } from "./PublishRouteDialog";
import type { Audience } from "@/lib/publicRoutes";
import { useTranslation } from "@/components/i18n/LanguageContext";

/** A standalone "save the current active itinerary as a named snapshot"
 * button — distinct from useSaveOrDiscardFlow's own save prompt, which only
 * ever appears bundled with a destructive follow-up (about to replace or
 * clear the active itinerary). This one does neither: the active itinerary
 * keeps being edited exactly as before, a new saved copy just joins the
 * "📂 שמורים" dropdown's list, so trying out a different route for the same
 * trip doesn't mean losing today's version first. */
export function SaveItineraryButton({ destinationId, slug, hasExistingDays }: { destinationId: string; slug: string; hasExistingDays: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [, startTransition] = useTransition();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  // Optional: publish the route to the community feed while saving it
  const [share, setShare] = useState(false);
  const [audience, setAudience] = useState<Audience[]>([]);
  const [description, setDescription] = useState("");
  const [shareMsg, setShareMsg] = useState<string | null>(null);
  const { t } = useTranslation();

  function handleSave() {
    setSaving(true);
    startTransition(async () => {
      const finalName = name.trim() || t("itinerary.myRouteDefaultName");
      const result = await saveItineraryAsTemplate(destinationId, slug, finalName, "personal");
      if (result && "error" in result) {
        setSaving(false);
        window.alert(result.error);
        return;
      }
      if (share && result && "id" in result && result.id) {
        const pub = await setRoutePublic(result.id, slug, { isPublic: true, name: finalName, audience, description });
        if ("error" in pub) {
          // The route itself is saved; only the publishing failed - say why and keep the panel open.
          setSaving(false);
          setShareMsg(publishErrorText(pub.error, t));
          router.refresh();
          return;
        }
      }
      setSaving(false);
      setShareMsg(null);
      setShare(false);
      setOpen(false);
      setName("");
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      router.refresh();
    });
  }

  return (
    <div className="relative shrink-0">
      <button
        onClick={() => setOpen((v) => !v)}
        disabled={!hasExistingDays}
        title={hasExistingDays ? t("itinerary.saveCurrentTitled") : t("itinerary.noRouteYet")}
        className="flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-semibold shadow-sm disabled:opacity-40"
        style={{ borderColor: "var(--primary)", color: "var(--primary)", background: "var(--surface)" }}
      >
        {saved ? t("itinerary.saved") : t("itinerary.saveButton")}
      </button>
      {open &&
        typeof document !== "undefined" &&
        createPortal(
          // A real modal portaled to <body>: the pill row this button lives in scrolls horizontally and sits inside the
          // itinerary map's own stacking context, so an in-place dropdown was clipped / hidden behind the route drawer
          // (the save settings could not be seen). On phones it is a bottom sheet, on desktop a centered card.
          <div className="fixed inset-0 z-[400] flex items-end justify-center bg-black/40 p-3 sm:items-center" onClick={() => setOpen(false)}>
            <div
              onClick={(e) => e.stopPropagation()}
              className="flex max-h-[88vh] w-full max-w-sm flex-col gap-3 overflow-y-auto rounded-2xl p-4 shadow-2xl"
              style={{ background: "var(--surface)" }}
            >
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold">{t("itinerary.saveButton")}</h2>
                <button onClick={() => setOpen(false)} className="text-xl opacity-50 hover:opacity-100" aria-label={t("nav.close")}>
                  ✕
                </button>
              </div>
              <label className="flex flex-col gap-1 text-xs font-bold opacity-80">
                {t("itinerary.whatToCallIt")}
                <input
                  autoFocus
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSave()}
                  placeholder={t("itinerary.namePlaceholder")}
                  className="w-full rounded-lg border px-2 py-1.5 text-sm font-normal"
                  style={{ borderColor: "var(--primary)", background: "var(--surface)" }}
                />
              </label>
              <label className="flex cursor-pointer items-center gap-2 rounded-xl border p-2.5 text-sm font-bold" style={{ borderColor: share ? "var(--primary)" : "rgba(0,0,0,0.12)" }}>
                <input type="checkbox" checked={share} onChange={(e) => setShare(e.target.checked)} className="h-4 w-4" />
                <span>🌍 {t("pub.share.toggle")}</span>
              </label>
              {share && <PublishFields audience={audience} onAudience={setAudience} description={description} onDescription={setDescription} />}
              {shareMsg && <p className="text-sm font-semibold text-red-600">{shareMsg}</p>}
              <div className="flex gap-2">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 rounded-full px-4 py-2.5 text-sm font-bold text-white disabled:opacity-60"
                  style={{ background: "var(--primary)" }}
                >
                  {saving ? t("itinerary.saving") : share ? t("pub.share.save") + " + 🌍" : t("itinerary.savePlain")}
                </button>
                <button onClick={() => setOpen(false)} className="rounded-full px-4 py-2.5 text-sm opacity-60">
                  {t("itinerary.cancel")}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
