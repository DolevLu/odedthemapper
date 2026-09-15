"use client";

import { useState } from "react";
import { ensureItineraryShareToken } from "@/lib/actions/share";
import { useTranslation } from "@/components/i18n/LanguageContext";

export function ExportPdfButton({ destinationId, slug }: { destinationId: string; slug: string }) {
  const [loading, setLoading] = useState(false);
  const { t } = useTranslation();

  async function handleClick() {
    setLoading(true);
    const token = await ensureItineraryShareToken(destinationId, slug, "personal", "itinerary");
    setLoading(false);
    window.open(`/share/itinerary/${token}`, "_blank");
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className="shrink-0 whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-semibold shadow-sm disabled:opacity-50"
      style={{ borderColor: "var(--primary)", color: "var(--primary)", background: "var(--surface)" }}
    >
      {loading ? t("itinerary.exportPdf.preparing") : t("itinerary.exportPdf.button")}
    </button>
  );
}
