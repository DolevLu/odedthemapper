"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "@/components/i18n/LanguageContext";
import { ensureGoogleMaps, loadPlacesLibrary } from "@/hooks/useGoogleMaps";
import { parseGoogleList, type ListItem } from "@/lib/googleList";
import { mapWithConcurrency, resolvePlaceById, resolvePlaceByQuery, type ResolvedPin } from "@/lib/googlePlaceDetails";
import { aiSuggestPlaces, saveResolvedPins } from "@/lib/actions/mapImport";

type Tab = "list" | "search" | "ai";
type Candidate = ResolvedPin & { why?: string | null };

const MAX_LIST_ITEMS = 80;

async function getService(): Promise<google.maps.places.PlacesService> {
  await ensureGoogleMaps();
  await loadPlacesLibrary();
  return new google.maps.places.PlacesService(document.createElement("div"));
}

function Checklist({
  pins,
  checked,
  onToggle,
}: {
  pins: Candidate[];
  checked: Set<number>;
  onToggle: (i: number) => void;
}) {
  return (
    <ul className="flex max-h-56 flex-col gap-1.5 overflow-y-auto">
      {pins.map((p, i) => (
        <li key={`${p.placeId}-${i}`}>
          <label className="flex cursor-pointer items-start gap-2 rounded-lg border p-2 text-sm" style={{ borderColor: "color-mix(in srgb, var(--primary) 20%, transparent)" }}>
            <input type="checkbox" checked={checked.has(i)} onChange={() => onToggle(i)} className="mt-1" />
            {p.details?.photoUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={p.details.photoUrl} alt="" className="h-10 w-10 shrink-0 rounded-md object-cover" />
            )}
            <span className="min-w-0">
              <span className="block truncate font-semibold">{p.name}</span>
              <span className="block truncate text-xs opacity-60">
                {[p.categoryName, p.details?.rating != null ? `⭐ ${p.details.rating}` : null, p.details?.address].filter(Boolean).join(" · ")}
              </span>
              {p.why && <span className="block text-xs opacity-70">{p.why}</span>}
            </span>
          </label>
        </li>
      ))}
    </ul>
  );
}

/** The "+" menu of the map: get places onto the shared map without a KML -
 * from a Google Maps list you exported, by searching, or by asking the AI.
 * Every route ends in the same verified-Google-place checklist, so what gets
 * saved is a real place with its photo, rating, address and link. */
export function AddToMapDialog({
  destinationId,
  slug,
  getCenter,
  onPickKml,
  onClose,
}: {
  destinationId: string;
  slug: string;
  getCenter: () => { lat: number; lng: number } | null;
  onPickKml: () => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("list");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [unresolved, setUnresolved] = useState<string[]>([]);
  const [checked, setChecked] = useState<Set<number>>(new Set());
  const [aiPrompt, setAiPrompt] = useState("");
  const [query, setQuery] = useState("");
  const [predictions, setPredictions] = useState<{ placeId: string; description: string }[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);
  const sessionTokenRef = useRef<google.maps.places.AutocompleteSessionToken | null>(null);
  const source = tab === "list" ? "google_list" : tab === "ai" ? "ai" : "manual";

  function reset(nextTab: Tab) {
    setTab(nextTab);
    setCandidates([]);
    setUnresolved([]);
    setChecked(new Set());
    setError(null);
    setDone(null);
  }

  function showCandidates(list: Candidate[]) {
    setCandidates(list);
    setChecked(new Set(list.map((_, i) => i)));
  }

  async function handleListFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setError(null);
    setDone(null);
    const items: ListItem[] = parseGoogleList(await file.text(), file.name);
    if (items.length === 0) {
      setError(t("addMap.list.noItems"));
      return;
    }
    const limited = items.slice(0, MAX_LIST_ITEMS);
    try {
      const service = await getService();
      const center = getCenter();
      setBusy(`${t("addMap.working")} 0/${limited.length}`);
      const results = await mapWithConcurrency(
        limited,
        3,
        async (item) => {
          const near = item.lat != null && item.lng != null ? { lat: item.lat, lng: item.lng } : center;
          const resolved = await resolvePlaceByQuery(service, item.title, near);
          if (resolved) return { ...resolved, note: item.note } as Candidate;
          // Google couldn't match the name - keep it anyway when the export
          // gave us real coordinates, so nothing the user saved is lost.
          if (item.lat != null && item.lng != null) {
            return {
              placeId: `import:${crypto.randomUUID()}`,
              name: item.title,
              lat: item.lat,
              lng: item.lng,
              categoryName: null,
              note: item.note,
              details: item.url
                ? { address: null, phone: null, website: null, url: item.url, photoUrl: null, rating: null, ratingCount: null, hours: null, suggestedCategory: null }
                : null,
            } as Candidate;
          }
          return null;
        },
        (d, total) => setBusy(`${t("addMap.working")} ${d}/${total}`)
      );
      const ok = results.filter((r): r is Candidate => r !== null);
      setUnresolved(limited.filter((_, i) => results[i] === null).map((i) => i.title));
      showCandidates(ok);
      if (items.length > MAX_LIST_ITEMS) setDone(`${t("addMap.list.truncated")} ${MAX_LIST_ITEMS}`);
    } catch {
      setError(t("addMap.googleFailed"));
    }
    setBusy(null);
  }

  // Place search (autocomplete)
  useEffect(() => {
    if (tab !== "search") return;
    const q = query.trim();
    if (q.length < 2) {
      setPredictions([]);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        await ensureGoogleMaps();
        await loadPlacesLibrary();
        if (cancelled) return;
        sessionTokenRef.current ??= new google.maps.places.AutocompleteSessionToken();
        const center = getCenter();
        new google.maps.places.AutocompleteService().getPlacePredictions(
          {
            input: q,
            sessionToken: sessionTokenRef.current,
            ...(center ? { locationBias: { center, radius: 50000 } } : {}),
          },
          (results, status) => {
            if (cancelled) return;
            setPredictions(
              status === google.maps.places.PlacesServiceStatus.OK && results
                ? results.slice(0, 5).map((r) => ({ placeId: r.place_id, description: r.description }))
                : []
            );
          }
        );
      } catch {
        if (!cancelled) setPredictions([]);
      }
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, tab, getCenter]);

  async function pickPrediction(placeId: string) {
    setBusy(t("addMap.working"));
    setError(null);
    try {
      const resolved = await resolvePlaceById(await getService(), placeId);
      if (!resolved) setError(t("addMap.googleFailed"));
      else {
        showCandidates([resolved]);
        setPredictions([]);
        sessionTokenRef.current = null;
      }
    } catch {
      setError(t("addMap.googleFailed"));
    }
    setBusy(null);
  }

  async function runAi() {
    setError(null);
    setDone(null);
    setBusy(t("addMap.ai.thinking"));
    try {
      const res = await aiSuggestPlaces(destinationId, aiPrompt);
      if ("error" in res) {
        setError(res.error);
        setBusy(null);
        return;
      }
      const service = await getService();
      const center = getCenter();
      setBusy(`${t("addMap.ai.verifying")} 0/${res.suggestions.length}`);
      const resolved = await mapWithConcurrency(
        res.suggestions,
        3,
        async (s) => {
          const place = await resolvePlaceByQuery(service, s.query, center);
          return place ? ({ ...place, categoryName: place.categoryName ?? s.category, why: s.why } as Candidate) : null;
        },
        (d, total) => setBusy(`${t("addMap.ai.verifying")} ${d}/${total}`)
      );
      const ok = resolved.filter((r): r is Candidate => r !== null);
      // Same place suggested twice under different names - keep one.
      const uniq = ok.filter((p, i) => ok.findIndex((q) => q.placeId === p.placeId) === i);
      setUnresolved(res.suggestions.filter((_, i) => resolved[i] === null).map((s) => s.query.split(",")[0]));
      showCandidates(uniq);
    } catch {
      setError(t("addMap.googleFailed"));
    }
    setBusy(null);
  }

  async function saveChecked() {
    const chosen = candidates.filter((_, i) => checked.has(i));
    if (chosen.length === 0) return;
    setBusy(t("addMap.saving"));
    try {
      const { saved, skipped } = await saveResolvedPins(destinationId, slug, chosen, source);
      setDone(`${t("addMap.saved")} ${saved}${skipped > 0 ? ` · ${t("addMap.alreadyThere")} ${skipped}` : ""}`);
      setCandidates([]);
      setChecked(new Set());
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("addMap.googleFailed"));
    }
    setBusy(null);
  }

  const tabBtn = (id: Tab, label: string) => (
    <button
      key={id}
      onClick={() => reset(id)}
      className="rounded-full px-3 py-1.5 text-xs font-semibold"
      style={{ background: tab === id ? "var(--primary)" : "transparent", color: tab === id ? "white" : "var(--text)" }}
    >
      {label}
    </button>
  );

  return (
    <div className="fixed inset-0 z-[300] flex items-end justify-center bg-black/40 p-4 sm:items-center" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[90vh] w-full max-w-md flex-col gap-3 overflow-y-auto rounded-2xl p-5 shadow-2xl"
        style={{ background: "var(--surface)" }}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">{t("addMap.title")}</h2>
          <button onClick={onClose} className="text-xl opacity-50 hover:opacity-100" aria-label={t("nav.close")}>
            ✕
          </button>
        </div>

        <div className="flex flex-wrap gap-1 rounded-full bg-black/5 p-1">
          {tabBtn("list", t("addMap.tab.list"))}
          {tabBtn("search", t("addMap.tab.search"))}
          {tabBtn("ai", t("addMap.tab.ai"))}
        </div>

        {tab === "list" && (
          <div className="flex flex-col gap-2">
            <p className="text-sm opacity-70">{t("addMap.list.intro")}</p>
            <details className="text-xs opacity-80">
              <summary className="cursor-pointer font-semibold">{t("addMap.list.howTitle")}</summary>
              <ol className="mt-1 list-decimal ps-5">
                <li>{t("addMap.list.how1")}</li>
                <li>{t("addMap.list.how2")}</li>
                <li>{t("addMap.list.how3")}</li>
              </ol>
            </details>
            <input ref={fileRef} type="file" accept=".csv,.json,.geojson,text/csv,application/json" className="hidden" onChange={handleListFile} />
            <button
              onClick={() => fileRef.current?.click()}
              disabled={busy !== null}
              className="rounded-full px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"
              style={{ background: "var(--primary)" }}
            >
              📋 {t("addMap.list.choose")}
            </button>
            <button onClick={() => { onClose(); onPickKml(); }} className="text-start text-xs underline opacity-60 hover:opacity-100">
              {t("addMap.list.orKml")}
            </button>
          </div>
        )}

        {tab === "search" && (
          <div className="flex flex-col gap-2">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("addMap.search.placeholder")}
              className="rounded-full border px-4 py-2 text-sm"
              style={{ borderColor: "var(--primary)", background: "var(--surface)" }}
            />
            {predictions.length > 0 && (
              <ul className="flex flex-col overflow-hidden rounded-xl border" style={{ borderColor: "rgba(0,0,0,0.1)" }}>
                {predictions.map((p) => (
                  <li key={p.placeId}>
                    <button onClick={() => pickPrediction(p.placeId)} className="w-full px-3 py-2 text-start text-sm hover:bg-black/5">
                      {p.description}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {tab === "ai" && (
          <div className="flex flex-col gap-2">
            <p className="text-sm opacity-70">{t("addMap.ai.intro")}</p>
            <textarea
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              rows={3}
              maxLength={400}
              placeholder={t("addMap.ai.placeholder")}
              className="rounded-xl border px-3 py-2 text-sm"
              style={{ borderColor: "var(--primary)", background: "var(--surface)" }}
            />
            <button
              onClick={runAi}
              disabled={busy !== null || aiPrompt.trim().length < 3}
              className="rounded-full px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"
              style={{ background: "linear-gradient(135deg, #7C3AED, #EC4899)" }}
            >
              ✨ {t("addMap.ai.go")}
            </button>
            <p className="text-[11px] opacity-50">{t("addMap.ai.verifiedNote")}</p>
          </div>
        )}

        {busy && <p className="text-sm font-semibold" role="status">⏳ {busy}</p>}
        {error && <p className="text-sm font-semibold text-red-600" role="alert">{error}</p>}
        {done && <p className="text-sm font-semibold text-emerald-600" role="status">✓ {done}</p>}

        {candidates.length > 0 && (
          <div className="flex flex-col gap-2">
            <p className="text-xs font-semibold opacity-70">
              {candidates.length} {t("addMap.found")} · {checked.size} {t("addMap.selected")}
            </p>
            <Checklist
              pins={candidates}
              checked={checked}
              onToggle={(i) =>
                setChecked((prev) => {
                  const next = new Set(prev);
                  if (next.has(i)) next.delete(i);
                  else next.add(i);
                  return next;
                })
              }
            />
            <button
              onClick={saveChecked}
              disabled={busy !== null || checked.size === 0}
              className="rounded-full px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"
              style={{ background: "var(--primary)" }}
            >
              {t("addMap.saveSelected")} ({checked.size})
            </button>
          </div>
        )}

        {unresolved.length > 0 && (
          <details className="text-xs opacity-70">
            <summary className="cursor-pointer">
              {unresolved.length} {t("addMap.notFound")}
            </summary>
            <p className="mt-1">{unresolved.join(" · ")}</p>
          </details>
        )}
      </div>
    </div>
  );
}
