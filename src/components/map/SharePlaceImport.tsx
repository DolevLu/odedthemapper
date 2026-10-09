"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useTranslation } from "@/components/i18n/LanguageContext";
import { ensureGoogleMaps, loadPlacesLibrary } from "@/hooks/useGoogleMaps";
import { resolvePlaceByQuery, type ResolvedPin } from "@/lib/googlePlaceDetails";
import { analyzeSharedLink, findDestinationForPoint, saveSocialPin, type NearbyDestination, type SharedSource } from "@/lib/actions/socialImport";
import { categoryLabel } from "@/lib/i18n/content";

type Candidate = ResolvedPin & { fromAi: boolean };
type Phase = "paste" | "reading" | "finding" | "pick" | "saving" | "done";

const PLATFORM_LABEL: Record<string, string> = { instagram: "Instagram", tiktok: "TikTok", facebook: "Facebook" };

async function getService(): Promise<google.maps.places.PlacesService> {
  await ensureGoogleMaps();
  await loadPlacesLibrary();
  return new google.maps.places.PlacesService(document.createElement("div"));
}

/** The whole "share a reel into Travi" flow on one screen: read the post -> guess the place -> verify it on Google
 * Places (in the browser, like every other import) -> work out which destination it belongs to -> one tap to add it
 * to the map with the original video attached as a link. */
export function SharePlaceImport({ initialText }: { initialText: string }) {
  const { t, lang } = useTranslation();
  const hasLink = /https?:[/][/]/i.test(initialText);
  const [phase, setPhase] = useState<Phase>(hasLink ? "reading" : "paste");
  const [pasted, setPasted] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState<SharedSource | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [selected, setSelected] = useState(0);
  const [destFor, setDestFor] = useState<{ key: string; dest: NearbyDestination | null } | null>(null);
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<{ slug: string; already: boolean } | null>(null);
  const startedRef = useRef(false);

  function errText(code: string): string {
    if (code === "no-link") return t("share.noLink");
    if (code === "quota") return t("share.quota");
    return t("share.failed");
  }

  async function resolveAll(queries: { query: string; category: string | null; fromAi: boolean }[]) {
    setPhase("finding");
    const service = await getService();
    const found: Candidate[] = [];
    for (const q of queries.slice(0, 3)) {
      const p = await resolvePlaceByQuery(service, q.query, null);
      if (p && !found.some((f) => f.placeId === p.placeId)) found.push({ ...p, categoryName: p.categoryName ?? q.category, fromAi: q.fromAi });
    }
    setCandidates(found);
    setSelected(0);
    setPhase("pick");
  }

  async function run(text: string) {
    setError(null);
    setPhase("reading");
    try {
      const res = await analyzeSharedLink(text);
      if (!res.ok) {
        setError(errText(res.error));
        setPhase("paste");
        return;
      }
      setSource(res.source);
      await resolveAll(res.guesses.map((g) => ({ query: g.query, category: g.category, fromAi: res.via === "ai" })));
    } catch {
      setError(t("share.failed"));
      setPhase("paste");
    }
  }

  useEffect(() => {
    if (startedRef.current || !hasLink) return;
    startedRef.current = true;
    run(initialText);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Which destination does the chosen place belong to?
  const chosen = candidates[selected];
  const chosenKey = chosen?.placeId;
  // undefined while the lookup for the currently chosen place is still running
  const dest = destFor && destFor.key === chosenKey ? destFor.dest : undefined;
  useEffect(() => {
    if (!chosen || !chosenKey) return;
    let cancelled = false;
    findDestinationForPoint(chosen.lat, chosen.lng)
      .then((d) => !cancelled && setDestFor({ key: chosenKey, dest: d }))
      .catch(() => !cancelled && setDestFor({ key: chosenKey, dest: null }));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chosenKey]);

  async function manualSearch() {
    const q = query.trim();
    if (q.length < 2) return;
    setError(null);
    try {
      await resolveAll([{ query: q, category: null, fromAi: false }]);
    } catch {
      setError(t("share.failed"));
      setPhase("pick");
    }
  }

  async function save() {
    if (!chosen || !dest || !source) return;
    setPhase("saving");
    setError(null);
    try {
      const res = await saveSocialPin(dest.id, dest.slug, chosen, {
        url: source.url,
        platform: source.platform,
        thumbnail: source.thumbnail,
        title: source.title,
        caption: source.caption,
      });
      if (!res.ok) {
        setError(t("share.failed"));
        setPhase("pick");
        return;
      }
      setResult({ slug: dest.slug, already: res.already });
      setPhase("done");
    } catch {
      setError(t("share.failed"));
      setPhase("pick");
    }
  }

  const busyText = phase === "reading" ? t("share.reading") : phase === "finding" ? t("share.finding") : null;

  return (
    <div className="flex flex-col gap-4">
      {source && (
        <div className="flex items-center gap-3 rounded-2xl border p-3" style={{ borderColor: "rgba(0,0,0,0.08)", background: "var(--surface)" }}>
          {source.thumbnail ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={source.thumbnail} alt="" className="h-16 w-16 shrink-0 rounded-xl object-cover" referrerPolicy="no-referrer" />
          ) : (
            <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-black/5 text-2xl">▶</span>
          )}
          <div className="min-w-0 text-sm">
            <p className="font-bold">
              {t("share.sourceFrom")} {PLATFORM_LABEL[source.platform] ?? source.platform}
              {source.author ? ` · @${source.author}` : ""}
            </p>
            {source.caption && <p className="line-clamp-2 text-xs opacity-70">{source.caption}</p>}
          </div>
        </div>
      )}

      {phase === "paste" && (
        <div className="flex flex-col gap-2">
          <p className="text-sm font-bold">{t("share.paste.title")}</p>
          <input
            value={pasted}
            onChange={(e) => setPasted(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && pasted.trim().length > 10 && run(pasted)}
            placeholder="https://www.instagram.com/reel/..."
            inputMode="url"
            dir="ltr"
            className="rounded-full border px-4 py-2 text-sm"
            style={{ borderColor: "var(--primary)", background: "var(--surface)" }}
          />
          <button onClick={() => run(pasted)} disabled={pasted.trim().length < 12} className="rounded-full px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50" style={{ background: "linear-gradient(135deg, #6D28D9, #EC4899)" }}>
            📍 {t("share.paste.go")}
          </button>
          <p className="text-[11px] opacity-50">{t("share.paste.tip")}</p>
        </div>
      )}

      {busyText && (
        <p className="text-sm font-semibold" role="status">
          ⏳ {busyText}
        </p>
      )}
      {error && (
        <p className="text-sm font-semibold text-red-600" role="alert">
          {error}
        </p>
      )}

      {(phase === "pick" || phase === "saving") && (
        <>
          {candidates.length > 0 ? (
            <div className="flex flex-col gap-2">
              <p className="text-sm font-bold">{t("share.foundHeading")}</p>
              {candidates.map((c, i) => {
                const active = i === selected;
                return (
                  <button
                    key={c.placeId}
                    onClick={() => setSelected(i)}
                    className="flex items-center gap-3 rounded-2xl border p-3 text-start"
                    style={{ borderColor: active ? "var(--primary)" : "rgba(0,0,0,0.1)", background: active ? "color-mix(in srgb, var(--primary) 8%, var(--surface))" : "var(--surface)" }}
                  >
                    {c.details?.photoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={c.details.photoUrl} alt="" className="h-16 w-16 shrink-0 rounded-xl object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-black/5 text-2xl">📍</span>
                    )}
                    <span className="min-w-0 text-sm">
                      <span className="block font-bold">{c.name}</span>
                      {c.details?.address && <span className="block truncate text-xs opacity-60">{c.details.address}</span>}
                      <span className="mt-0.5 block text-xs opacity-70">
                        {c.details?.rating != null ? `⭐ ${c.details.rating} · ` : ""}
                        {c.categoryName ? categoryLabel(lang, c.categoryName) : ""}
                        {c.fromAi && i === 0 ? ` · ${t("share.viaAi")}` : ""}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          ) : (
            <p className="text-sm opacity-80">{t("share.noGuess")}</p>
          )}

          <div className="flex gap-2">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && manualSearch()}
              placeholder={t("share.searchPlaceholder")}
              className="min-w-0 flex-1 rounded-full border px-4 py-2 text-sm"
              style={{ borderColor: "var(--primary)", background: "var(--surface)" }}
            />
            <button onClick={manualSearch} disabled={query.trim().length < 2} className="rounded-full px-4 py-2 text-sm font-bold text-white disabled:opacity-50" style={{ background: "var(--primary)" }}>
              {t("share.search")}
            </button>
          </div>

          {chosen && dest === null && <p className="text-sm font-semibold text-amber-700">{t("share.noDestination")}</p>}
          {chosen && dest && (
            <>
              <p className="text-xs font-semibold opacity-70">
                {t("share.addTo")} {dest.name}
              </p>
              <button
                onClick={save}
                disabled={phase === "saving"}
                className="rounded-full px-5 py-3 text-base font-bold text-white disabled:opacity-60"
                style={{ background: "linear-gradient(135deg, #6D28D9, #EC4899)" }}
              >
                {t("share.add")}
              </button>
            </>
          )}
        </>
      )}

      {phase === "done" && result && (
        <div className="flex flex-col gap-3">
          <p className="text-base font-bold text-emerald-600" role="status">
            ✓ {result.already ? t("share.already") : t("share.saved")}
          </p>
          <Link href={`/trip/${result.slug}`} className="rounded-full px-5 py-3 text-center font-bold text-white" style={{ background: "var(--primary)" }}>
            {t("share.openMap")}
          </Link>
        </div>
      )}
    </div>
  );
}
