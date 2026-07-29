"use client";

import { useState } from "react";
import { enableItineraryShareLink, disableItineraryShareLink } from "@/lib/actions/share";

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
        {loading ? "יוצר קישור..." : "🔗 יצירת קישור צפייה ללקוח / הדפסת PDF"}
      </button>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      <input readOnly value={url} className="w-64 rounded-lg border px-2 py-1.5 text-xs" style={{ borderColor: "var(--primary)" }} />
      <button onClick={copy} className="rounded-full px-3 py-1.5 text-xs font-semibold text-white" style={{ background: "var(--primary)" }}>
        {copied ? "הועתק!" : "העתקה"}
      </button>
      <button onClick={handleDisable} disabled={loading} className="text-xs opacity-60 underline">
        ביטול הקישור
      </button>
    </div>
  );
}
