"use client";

import { useState, useTransition } from "react";
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
      {open && (
        <div
          className="absolute z-30 mt-1 w-72 rounded-xl border p-2.5 shadow-lg"
          style={{ background: "var(--surface)", borderColor: "color-mix(in srgb, var(--primary) 20%, transparent)" }}
        >
          <p className="mb-2 text-xs font-bold opacity-70">{t("itinerary.whatToCallIt")}</p>
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSave()}
            placeholder={t("itinerary.namePlaceholder")}
            className="mb-2 w-full rounded-lg border px-2 py-1.5 text-sm"
            style={{ borderColor: "var(--primary)" }}
          />
          <label className="mb-2 flex cursor-pointer items-center gap-2 text-xs font-bold">
            <input type="checkbox" checked={share} onChange={(e) => setShare(e.target.checked)} />
            🌍 {t("pub.share.toggle")}
          </label>
          {share && (
            <div className="mb-2">
              <PublishFields audience={audience} onAudience={setAudience} description={description} onDescription={setDescription} />
            </div>
          )}
          {shareMsg && <p className="mb-2 text-xs font-semibold text-red-600">{shareMsg}</p>}
          <div className="flex gap-1.5">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 rounded-full px-3 py-1.5 text-xs font-bold text-white disabled:opacity-60"
              style={{ background: "var(--primary)" }}
            >
              {saving ? t("itinerary.saving") : t("itinerary.savePlain")}
            </button>
            <button onClick={() => setOpen(false)} className="rounded-full px-3 py-1.5 text-xs opacity-60">
              {t("itinerary.cancel")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
