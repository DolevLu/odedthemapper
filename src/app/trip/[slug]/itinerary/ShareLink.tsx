"use client";

import { useState } from "react";
import { enableItineraryShareLink, disableItineraryShareLink } from "@/lib/actions/share";
import { useTranslation } from "@/components/i18n/LanguageContext";

export function ShareLink({
  destinationId,
  slug,
  shareToken,
  kind = "personal",
  path = "itinerary",
}: {
  destinationId: string;
  slug: string;
  shareToken: string | null;
  kind?: "personal" | "client";
  path?: string;
}) {
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const { t } = useTranslation();

  const url = shareToken && typeof window !== "undefined" ? `${window.location.origin}/share/itinerary/${shareToken}` : "";

  async function handleEnable() {
    setLoading(true);
    await enableItineraryShareLink(destinationId, slug, kind, path);
    setLoading(false);
  }

  async function handleDisable() {
    setLoading(true);
    await disableItineraryShareLink(destinationId, slug, kind, path);
    setLoading(false);
  }

  function copy() {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  if (!shareToken) {
    return (
      <button
        onClick={handleEnable}
        disabled={loading}
        className="rounded-full border px-4 py-2 text-sm font-semibold disabled:opacity-50"
        style={{ borderColor: "var(--primary)", color: "var(--primary)" }}
      >
        {loading ? t("itinerary.share.creatingLink") : t("itinerary.share.createLink")}
      </button>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      <input readOnly value={url} className="w-64 rounded-lg border px-2 py-1.5 text-xs" style={{ borderColor: "var(--primary)" }} />
      <button onClick={copy} className="rounded-full px-3 py-1.5 text-xs font-semibold text-white" style={{ background: "var(--primary)" }}>
        {copied ? t("itinerary.share.copied") : t("itinerary.share.copy")}
      </button>
      <button onClick={handleDisable} disabled={loading} className="text-xs opacity-60 underline">
        {t("itinerary.share.disableLink")}
      </button>
    </div>
  );
}
