"use client";

import { useEffect, useRef, useState } from "react";
import { useGoogleMaps } from "@/hooks/useGoogleMaps";
import { toggleVisitedCountry } from "@/lib/actions/visitedCountries";
import { WORLD_COUNTRIES, flagEmoji } from "@/lib/worldCountries";

export function VisitedCountriesMap({ initialVisited, slug }: { initialVisited: string[]; slug?: string }) {
  const { loaded } = useGoogleMaps();
  const mapDivRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const [visited, setVisited] = useState<Set<string>>(new Set(initialVisited));
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!loaded || !mapDivRef.current || mapRef.current) return;
    mapRef.current = new google.maps.Map(mapDivRef.current, {
      center: { lat: 15, lng: 10 },
      zoom: 1,
      streetViewControl: false,
      fullscreenControl: false,
      mapTypeControl: false,
      gestureHandling: "greedy",
    });
  }, [loaded]);

  // Redraw pins whenever the visited set changes.
  useEffect(() => {
    if (!loaded || !mapRef.current) return;
    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];

    for (const country of WORLD_COUNTRIES) {
      if (!visited.has(country.code)) continue;
      const marker = new google.maps.Marker({
        position: { lat: country.lat, lng: country.lng },
        map: mapRef.current,
        title: country.name,
        label: { text: flagEmoji(country.code), fontSize: "16px" },
      });
      markersRef.current.push(marker);
    }
  }, [loaded, visited]);

  function toggle(code: string) {
    setVisited((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
    toggleVisitedCountry(code, slug);
  }

  const filtered = query.trim()
    ? WORLD_COUNTRIES.filter((c) => c.name.includes(query.trim()))
    : WORLD_COUNTRIES;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg font-bold">🗺️ המדינות שביקרתי בהן</h2>
        <span className="rounded-full px-3 py-1 text-sm font-bold text-white" style={{ background: "var(--primary)" }}>
          {visited.size}
        </span>
      </div>

      <div
        ref={mapDivRef}
        className="h-[280px] w-full overflow-hidden"
        style={{ borderRadius: "var(--radius)", border: "1px solid var(--primary)" }}
      />

      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="חיפוש מדינה להוספה..."
        className="rounded-lg border px-3 py-2 text-sm"
        style={{ borderColor: "var(--primary)" }}
      />

      <div className="grid max-h-64 grid-cols-2 gap-1.5 overflow-y-auto sm:grid-cols-3 md:grid-cols-4">
        {filtered.map((country) => {
          const isVisited = visited.has(country.code);
          return (
            <button
              key={country.code}
              onClick={() => toggle(country.code)}
              className="flex items-center gap-1.5 rounded-lg border px-2 py-1.5 text-start text-xs font-medium"
              style={{
                borderColor: isVisited ? "var(--primary)" : "color-mix(in srgb, var(--primary) 20%, transparent)",
                background: isVisited ? "color-mix(in srgb, var(--primary) 12%, var(--surface))" : "var(--surface)",
              }}
            >
              <span>{flagEmoji(country.code)}</span>
              <span className="min-w-0 flex-1 truncate">{country.name}</span>
              {isVisited && <span style={{ color: "var(--primary)" }}>✓</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}
