"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { askTravi, type TraviSuggestion } from "@/lib/actions/travi";
import { FavoriteButton } from "@/components/FavoriteButton";

type Message = { role: "user" | "travi"; text: string; suggestions?: TraviSuggestion[] };

function formatDistance(km: number): string {
  return km < 1 ? `${Math.round(km * 1000)} מ׳` : `${km.toFixed(1)} ק״מ`;
}

export function TraviChat({ destinationId, slug }: { destinationId: string; slug: string }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: "travi", text: "היי! אני טראבי 🧭 שאלו אותי על מסעדות, ברים, אטרקציות בסביבה, או איך להשתמש באפליקציה." },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [locationEnabled, setLocationEnabled] = useState(false);
  const positionRef = useRef<{ lat: number; lng: number } | null>(null);

  function shareLocation() {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        positionRef.current = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setLocationEnabled(true);
      },
      () => setLocationEnabled(false)
    );
  }

  async function send() {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");
    setMessages((m) => [...m, { role: "user", text }]);
    setLoading(true);
    const reply = await askTravi(destinationId, text, positionRef.current);
    setMessages((m) => [...m, { role: "travi", text: reply.text, suggestions: reply.suggestions }]);
    setLoading(false);
  }

  return (
    <>
      <button
        onClick={() => setOpen((o) => !o)}
        className="fixed bottom-52 right-4 z-[150] flex h-14 w-14 items-center justify-center rounded-full text-2xl text-white shadow-xl sm:bottom-6 sm:right-72"
        style={{ background: "linear-gradient(135deg, #7C3AED, #EC4899)" }}
        aria-label="טראבי — עוזר הטיול"
      >
        💬
      </button>

      {open && (
        <div className="fixed bottom-72 right-4 z-[150] flex h-[480px] w-[calc(100vw-2rem)] max-w-sm flex-col overflow-hidden rounded-2xl bg-white shadow-2xl sm:bottom-24 sm:right-72">
          <div className="flex items-center justify-between gap-2 px-4 py-3 text-white" style={{ background: "linear-gradient(135deg, #7C3AED, #EC4899)" }}>
            <span className="font-bold">💬 טראבי</span>
            <button onClick={() => setOpen(false)} className="text-lg opacity-80 hover:opacity-100">
              ✕
            </button>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto p-3">
            {messages.map((m, i) => (
              <div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
                <div
                  className="max-w-[85%] rounded-2xl px-3 py-2 text-sm"
                  style={{ background: m.role === "user" ? "#7C3AED" : "#F3F4F6", color: m.role === "user" ? "white" : "#1a1a1a" }}
                >
                  <p>{m.text}</p>
                  {m.suggestions && m.suggestions.length > 0 && (
                    <div className="mt-2 flex flex-col gap-1.5">
                      {m.suggestions.map((s) => (
                        <div key={s.id} className="flex items-center gap-1 rounded-lg bg-white px-2.5 py-1.5 text-xs text-black shadow-sm">
                          <Link href={`/trip/${slug}?focus=${s.id}`} className="min-w-0 flex-1">
                            <span className="font-semibold">{s.name}</span>
                            <span className="opacity-60"> · {s.areaName}</span>
                            {s.distanceKm !== null && <span className="opacity-60"> · {formatDistance(s.distanceKm)}</span>}
                            <span className="opacity-60"> · 🗺️ הראו במפה</span>
                          </Link>
                          <FavoriteButton poiId={s.id} slug={slug} />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {loading && <p className="text-xs opacity-50">טראבי חושב...</p>}
          </div>

          {!locationEnabled && (
            <button onClick={shareLocation} className="border-t px-3 py-1.5 text-start text-xs opacity-60 hover:opacity-100" style={{ borderColor: "#1A1A1A11" }}>
              📍 שתפו מיקום כדי לקבל המלצות לפי קרבה
            </button>
          )}

          <div className="flex items-center gap-2 border-t p-2" style={{ borderColor: "#1A1A1A11" }}>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
              placeholder="שאלו את טראבי..."
              className="min-w-0 flex-1 rounded-full border px-3 py-2 text-sm"
              style={{ borderColor: "#1A1A1A22" }}
            />
            <button
              onClick={send}
              disabled={loading}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white disabled:opacity-50"
              style={{ background: "#7C3AED" }}
            >
              ➤
            </button>
          </div>
        </div>
      )}
    </>
  );
}
