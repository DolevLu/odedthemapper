"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { optimizeClientItinerary } from "@/lib/actions/trip";

export function OptimizeButton({ itineraryId, slug }: { itineraryId: string; slug: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleOptimize() {
    setLoading(true);
    await optimizeClientItinerary(itineraryId, slug);
    setLoading(false);
    router.refresh();
  }

  return (
    <button
      onClick={handleOptimize}
      disabled={loading}
      className="rounded-full px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
      style={{ background: "linear-gradient(135deg, #7C3AED, #EC4899)" }}
      title="סידור מחדש לפי קרבה גיאוגרפית בין ובתוך הימים"
    >
      {loading ? "מייעל..." : "🤖 שמור ושפר לפי מרחקים"}
    </button>
  );
}
