"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { addItineraryItem, addCustomItineraryItem } from "@/lib/actions/trip";
import { loadPlacesLibrary } from "@/hooks/useGoogleMaps";
import { PinPickerModal } from "./PinPickerModal";

export type PoiOption = { id: string; name: string; areaName: string; categoryName: string };

type GooglePrediction = { placeId: string; description: string };

/** Debounced Google Places predictions for the search tab below — separate
 * from the plain client-side filter over `pois` (which needs no debounce,
 * it's just an in-memory substring match). Lazily loads the "places"
 * library on first real use, same as the Map screen's own search. */
function useGooglePredictions(query: string) {
  const [predictions, setPredictions] = useState<GooglePrediction[]>([]);
  const autocompleteServiceRef = useRef<google.maps.places.AutocompleteService | null>(null);
  const sessionTokenRef = useRef<google.maps.places.AutocompleteSessionToken | null>(null);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setPredictions([]);
      return;
    }
    let cancelled = false;
    const t = setTimeout(() => {
      loadPlacesLibrary()
        .then(() => {
          if (cancelled) return;
          if (!autocompleteServiceRef.current) {
            autocompleteServiceRef.current = new google.maps.places.AutocompleteService();
          }
          if (!sessionTokenRef.current) {
            sessionTokenRef.current = new google.maps.places.AutocompleteSessionToken();
          }
          autocompleteServiceRef.current.getPlacePredictions(
            { input: trimmed, sessionToken: sessionTokenRef.current },
            (results, status) => {
              if (cancelled) return;
              if (status !== google.maps.places.PlacesServiceStatus.OK || !results) {
                setPredictions([]);
                return;
              }
              setPredictions(results.slice(0, 5).map((r) => ({ placeId: r.place_id, description: r.description })));
            }
          );
        })
        .catch(() => setPredictions([]));
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [query]);

  return predictions;
}

/** Resolves a Google prediction's place_id to real coordinates — a plain
 * detached div is enough to construct PlacesService (it never needs to be
 * attached to the page since only getDetails is used, no rendered
 * attribution UI), same headless pattern as other one-off Places lookups
 * in this app. */
function resolvePlaceLocation(placeId: string): Promise<{ name: string; lat: number; lng: number } | null> {
  return loadPlacesLibrary().then(
    () =>
      new Promise((resolve) => {
        const service = new google.maps.places.PlacesService(document.createElement("div"));
        service.getDetails({ placeId, fields: ["name", "geometry"] }, (place, status) => {
          const location = place?.geometry?.location;
          if (status !== google.maps.places.PlacesServiceStatus.OK || !location) {
            resolve(null);
            return;
          }
          resolve({ name: place?.name ?? "", lat: location.lat(), lng: location.lng() });
        });
      })
  );
}

type Mode = "pick" | "search" | "custom";

export function AddItemToDay({
  dayId,
  slug,
  pois,
}: {
  dayId: string;
  slug: string;
  pois: PoiOption[];
}) {
  const [mode, setMode] = useState<Mode>("pick");
  const [, startTransition] = useTransition();

  // "בחירה מהרשימה" — the original cascading category → POI dropdowns.
  const [category, setCategory] = useState("");
  const [poiId, setPoiId] = useState("");
  const categories = useMemo(() => Array.from(new Set(pois.map((p) => p.categoryName))).sort(), [pois]);
  const poisInCategory = useMemo(() => pois.filter((p) => p.categoryName === category), [pois, category]);

  // "חיפוש" — live search across our own POIs and Google Places. This
  // panel lives inside a fixed-width side panel or a scrollable drawer
  // (mobile itinerary), and an absolutely-positioned dropdown nested inside
  // gets clipped by that ancestor's own overflow/scroll instead of floating
  // above everything (confirmed live — it rendered "below the screen").
  // Portaled to document.body and positioned from the input's own real
  // screen rect instead, same fix ProfileMenu already uses for its own
  // dropdown and for the same reason.
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [dropdownPos, setDropdownPos] = useState<{ top: number; left: number; width: number; maxHeight: number; flipped: boolean } | null>(null);
  const [mounted, setMounted] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const poiMatches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 1) return [];
    return pois.filter((p) => p.name.toLowerCase().includes(q)).slice(0, 5);
  }, [pois, query]);
  const placePredictions = useGooglePredictions(query);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    // A plain fixed max-height (e.g. a flat 16rem) rendered past the bottom
    // of the screen whenever the input itself sat low on the page — a
    // fixed-position box doesn't auto-clip to the viewport, so the rest of
    // the list was there but genuinely unreachable, not just visually cut
    // off (confirmed live on mobile). Clamps the box to whatever room
    // actually remains below the input, and flips it to open upward
    // instead when that space is too small but there's more room above —
    // the same "flip when it doesn't fit" behavior a native <select> uses.
    const MARGIN = 8;
    const MIN_USABLE_HEIGHT = 120;
    function updatePos() {
      const rect = searchInputRef.current?.getBoundingClientRect();
      if (!rect) return;
      const spaceBelow = window.innerHeight - rect.bottom - MARGIN;
      const spaceAbove = rect.top - MARGIN;
      const flipped = spaceBelow < MIN_USABLE_HEIGHT && spaceAbove > spaceBelow;
      const maxHeight = Math.max(120, Math.min(256, flipped ? spaceAbove : spaceBelow));
      setDropdownPos({
        top: flipped ? rect.top - MARGIN - maxHeight : rect.bottom + MARGIN,
        left: rect.left,
        width: rect.width,
        maxHeight,
        flipped,
      });
    }
    if (searchOpen) {
      updatePos();
      window.addEventListener("resize", updatePos);
      window.addEventListener("scroll", updatePos, true);
      return () => {
        window.removeEventListener("resize", updatePos);
        window.removeEventListener("scroll", updatePos, true);
      };
    }
  }, [searchOpen]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (searchInputRef.current?.contains(target)) return;
      if (dropdownRef.current?.contains(target)) return;
      setSearchOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  // "הוספה חופשית" — a plain text label, optionally paired with a
  // manually dropped pin.
  const [customLabel, setCustomLabel] = useState("");
  const [pinPickerOpen, setPinPickerOpen] = useState(false);

  function handleAddPoi() {
    if (!poiId) return;
    startTransition(() => {
      addItineraryItem(dayId, poiId, slug);
    });
    setCategory("");
    setPoiId("");
  }

  function handlePickSearchPoi(id: string) {
    startTransition(() => {
      addItineraryItem(dayId, id, slug);
    });
    setQuery("");
    setSearchOpen(false);
  }

  function handlePickPlace(prediction: GooglePrediction) {
    setResolving(true);
    resolvePlaceLocation(prediction.placeId).then((resolved) => {
      setResolving(false);
      if (!resolved) return;
      const fd = new FormData();
      fd.set("customLabel", resolved.name || prediction.description);
      fd.set("customLat", String(resolved.lat));
      fd.set("customLng", String(resolved.lng));
      startTransition(() => {
        addCustomItineraryItem(dayId, slug, fd);
      });
      setQuery("");
      setSearchOpen(false);
    });
  }

  function handleAddCustom() {
    if (!customLabel.trim()) return;
    const fd = new FormData();
    fd.set("customLabel", customLabel.trim());
    startTransition(() => {
      addCustomItineraryItem(dayId, slug, fd);
    });
    setCustomLabel("");
  }

  function handlePinConfirmed(lat: number, lng: number) {
    const label = customLabel.trim() || "נקודה על המפה";
    const fd = new FormData();
    fd.set("customLabel", label);
    fd.set("customLat", String(lat));
    fd.set("customLng", String(lng));
    startTransition(() => {
      addCustomItineraryItem(dayId, slug, fd);
    });
    setPinPickerOpen(false);
    setCustomLabel("");
  }

  const showSearchDropdown = searchOpen && query.trim().length >= 1 && (poiMatches.length > 0 || placePredictions.length > 0 || resolving);

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-dashed p-3" style={{ borderColor: "color-mix(in srgb, var(--primary) 30%, transparent)" }}>
      <div className="flex flex-wrap gap-1 text-xs">
        {([
          ["pick", "בחירה מהרשימה"],
          ["search", "חיפוש"],
          ["custom", "הוספה חופשית"],
        ] as [Mode, string][]).map(([m, label]) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className="rounded-full px-3 py-1 font-medium"
            style={{ background: mode === m ? "var(--primary)" : "transparent", color: mode === m ? "white" : "var(--text)" }}
          >
            {label}
          </button>
        ))}
      </div>

      {mode === "pick" && (
        // Deliberately always flex-col (no sm:flex-row) — this lives inside
        // a fixed-width side panel, not the full viewport, and sm: reacts to
        // VIEWPORT width, not the panel's — at desktop viewport widths it
        // was forcing two selects + a button into a ~380px column, which
        // overflowed the panel.
        <div className="flex flex-col gap-2">
          <select
            value={category}
            onChange={(e) => {
              setCategory(e.target.value);
              setPoiId("");
            }}
            className="w-full min-w-0 rounded-lg border px-2 py-1.5 text-sm"
            style={{ borderColor: "var(--primary)" }}
          >
            <option value="">בחרו קטגוריה...</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <select
            value={poiId}
            onChange={(e) => setPoiId(e.target.value)}
            disabled={!category}
            className="w-full min-w-0 rounded-lg border px-2 py-1.5 text-sm disabled:opacity-50"
            style={{ borderColor: "var(--primary)" }}
          >
            <option value="">בחרו נקודה...</option>
            {poisInCategory.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} · {p.areaName}
              </option>
            ))}
          </select>
          <button
            onClick={handleAddPoi}
            disabled={!poiId}
            className="w-full rounded-lg px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-40"
            style={{ background: "var(--primary)", borderRadius: "var(--radius)" }}
          >
            הוספה
          </button>
        </div>
      )}

      {mode === "search" && (
        <div className="relative">
          <input
            ref={searchInputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSearchOpen(true);
            }}
            onFocus={() => setSearchOpen(true)}
            placeholder="הקלידו שם מקום — מהיעד שלנו או מגוגל מפות"
            className="w-full min-w-0 rounded-lg border px-3 py-1.5 text-sm"
            style={{ borderColor: "var(--primary)" }}
          />
          {mounted &&
            showSearchDropdown &&
            dropdownPos &&
            createPortal(
              <div
                ref={dropdownRef}
                className="fixed z-[400] flex flex-col overflow-y-auto overscroll-contain rounded-lg border bg-[var(--surface)] shadow-lg"
                style={{
                  top: dropdownPos.top,
                  left: dropdownPos.left,
                  width: dropdownPos.width,
                  maxHeight: dropdownPos.maxHeight,
                  borderColor: "color-mix(in srgb, var(--primary) 25%, transparent)",
                }}
              >
                {poiMatches.length > 0 && (
                  <div className="flex flex-col">
                    <span className="px-3 pt-2 text-[10px] font-bold opacity-50">מהיעד שלנו</span>
                    {poiMatches.map((p) => (
                      <button key={p.id} onClick={() => handlePickSearchPoi(p.id)} className="px-3 py-1.5 text-start text-sm hover:bg-black/5">
                        {p.name} <span className="opacity-50">· {p.areaName}</span>
                      </button>
                    ))}
                  </div>
                )}
                {(placePredictions.length > 0 || resolving) && (
                  <div className="flex flex-col">
                    <span className="px-3 pt-2 text-[10px] font-bold opacity-50">Google Maps</span>
                    {resolving && <span className="px-3 py-1.5 text-sm opacity-60">טוען מיקום…</span>}
                    {!resolving &&
                      placePredictions.map((pred) => (
                        <button key={pred.placeId} onClick={() => handlePickPlace(pred)} className="px-3 py-1.5 text-start text-sm hover:bg-black/5">
                          📍 {pred.description}
                        </button>
                      ))}
                  </div>
                )}
              </div>,
              document.body
            )}
        </div>
      )}

      {mode === "custom" && (
        <div className="flex flex-col gap-2">
          <input
            value={customLabel}
            onChange={(e) => setCustomLabel(e.target.value)}
            placeholder='למשל: "נסיעה לעיירה סמוכה" או תחנה שלא ברשימה'
            className="w-full min-w-0 rounded-lg border px-3 py-1.5 text-sm"
            style={{ borderColor: "var(--primary)" }}
          />
          <div className="flex flex-wrap gap-2">
            <button
              onClick={handleAddCustom}
              disabled={!customLabel.trim()}
              className="rounded-lg px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-40"
              style={{ background: "var(--primary)", borderRadius: "var(--radius)" }}
            >
              הוספה (בלי מיקום)
            </button>
            <button
              onClick={() => setPinPickerOpen(true)}
              className="rounded-lg border px-3 py-1.5 text-sm font-semibold"
              style={{ borderColor: "var(--primary)", color: "var(--primary)" }}
            >
              📍 סימון מיקום על המפה
            </button>
          </div>
        </div>
      )}

      {pinPickerOpen && (
        <PinPickerModal initialLabel={customLabel.trim()} onConfirm={handlePinConfirmed} onClose={() => setPinPickerOpen(false)} />
      )}
    </div>
  );
}
