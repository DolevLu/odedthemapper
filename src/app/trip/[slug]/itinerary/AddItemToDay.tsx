"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { addItineraryItem, addCustomItineraryItem } from "@/lib/actions/trip";
import { loadPlacesLibrary } from "@/hooks/useGoogleMaps";
import { PinPickerModal } from "./PinPickerModal";

export type PoiOption = { id: string; name: string; areaName: string; categoryName: string };

type GooglePrediction = { placeId: string; description: string };

/** Debounced Google Places predictions for the free-text search box below —
 * separate from the plain client-side filter over `pois` (which needs no
 * debounce, it's just an in-memory substring match). Lazily loads the
 * "places" library on first real use, same as the Map screen's own search. */
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

export function AddItemToDay({
  dayId,
  slug,
  pois,
}: {
  dayId: string;
  slug: string;
  pois: PoiOption[];
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [pinPickerOpen, setPinPickerOpen] = useState(false);
  const [, startTransition] = useTransition();

  const poiMatches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 1) return [];
    return pois.filter((p) => p.name.toLowerCase().includes(q)).slice(0, 5);
  }, [pois, query]);

  const placePredictions = useGooglePredictions(query);

  function reset() {
    setQuery("");
    setOpen(false);
  }

  function handlePickPoi(poiId: string) {
    startTransition(() => {
      addItineraryItem(dayId, poiId, slug);
    });
    reset();
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
      reset();
    });
  }

  function handleAddFreeText() {
    const label = query.trim();
    if (!label) return;
    const fd = new FormData();
    fd.set("customLabel", label);
    startTransition(() => {
      addCustomItineraryItem(dayId, slug, fd);
    });
    reset();
  }

  function handlePinConfirmed(lat: number, lng: number) {
    const label = query.trim() || "נקודה על המפה";
    const fd = new FormData();
    fd.set("customLabel", label);
    fd.set("customLat", String(lat));
    fd.set("customLng", String(lng));
    startTransition(() => {
      addCustomItineraryItem(dayId, slug, fd);
    });
    setPinPickerOpen(false);
    reset();
  }

  const showDropdown = open && query.trim().length >= 1 && (poiMatches.length > 0 || placePredictions.length > 0 || resolving);

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-dashed p-3" style={{ borderColor: "color-mix(in srgb, var(--primary) 30%, transparent)" }}>
      <div className="relative">
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder="הקלידו שם מקום — מהיעד שלנו או מגוגל מפות"
          className="w-full min-w-0 rounded-lg border px-3 py-1.5 text-sm"
          style={{ borderColor: "var(--primary)" }}
        />
        {showDropdown && (
          <div
            className="absolute inset-x-0 top-full z-10 mt-1 flex max-h-64 flex-col overflow-y-auto rounded-lg border bg-[var(--surface)] shadow-lg"
            style={{ borderColor: "color-mix(in srgb, var(--primary) 25%, transparent)" }}
          >
            {poiMatches.length > 0 && (
              <div className="flex flex-col">
                <span className="px-3 pt-2 text-[10px] font-bold opacity-50">מהיעד שלנו</span>
                {poiMatches.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => handlePickPoi(p.id)}
                    className="px-3 py-1.5 text-start text-sm hover:bg-black/5"
                  >
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
                    <button
                      key={pred.placeId}
                      onClick={() => handlePickPlace(pred)}
                      className="px-3 py-1.5 text-start text-sm hover:bg-black/5"
                    >
                      📍 {pred.description}
                    </button>
                  ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          onClick={handleAddFreeText}
          disabled={!query.trim()}
          className="rounded-lg px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-40"
          style={{ background: "var(--primary)", borderRadius: "var(--radius)" }}
        >
          הוספה חופשית (בלי מיקום)
        </button>
        <button
          onClick={() => setPinPickerOpen(true)}
          className="rounded-lg border px-3 py-1.5 text-xs font-semibold"
          style={{ borderColor: "var(--primary)", color: "var(--primary)" }}
        >
          📍 סימון מיקום על המפה
        </button>
      </div>

      {pinPickerOpen && (
        <PinPickerModal
          initialLabel={query.trim()}
          onConfirm={handlePinConfirmed}
          onClose={() => setPinPickerOpen(false)}
        />
      )}
    </div>
  );
}
