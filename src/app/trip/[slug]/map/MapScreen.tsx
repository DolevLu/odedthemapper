"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { MarkerClusterer } from "@googlemaps/markerclusterer";
import { useGoogleMaps } from "@/hooks/useGoogleMaps";
import type { FlatPoi } from "@/lib/data/pois";
import { FavoriteButton } from "@/components/FavoriteButton";

function infoWindowHtml(poi: FlatPoi): string {
  const photo = poi.photoUrl
    ? `<img src="${poi.photoUrl}" alt="" style="width:220px;height:120px;object-fit:cover;border-radius:8px;margin-bottom:6px" />`
    : "";
  const description = poi.description
    ? `<div style="font-size:12px;opacity:.75;margin-top:4px;max-width:220px">${poi.description.slice(0, 220)}</div>`
    : "";
  return `<div style="font-family:'Rubik',sans-serif;padding:2px 4px">
    ${photo}
    <strong>${poi.name}</strong><br/>
    <span style="opacity:.6;font-size:12px">${poi.categoryName} · ${poi.areaName}</span>
    ${description}
  </div>`;
}

export function MapScreen({
  pois,
  categoryNames,
  slug,
  favoritedIds,
}: {
  pois: FlatPoi[];
  categoryNames: string[];
  slug: string;
  favoritedIds: Set<string>;
}) {
  const { loaded, error } = useGoogleMaps();
  const mapDivRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const clustererRef = useRef<MarkerClusterer | null>(null);
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);
  const markersByPoiId = useRef<Map<string, google.maps.Marker>>(new Map());

  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [selectedPoiId, setSelectedPoiId] = useState<string | null>(null);

  const pointPois = useMemo(() => pois.filter((p) => p.geometryType === "point"), [pois]);
  const filtered = useMemo(
    () => (activeCategory ? pointPois.filter((p) => p.categoryName === activeCategory) : pointPois),
    [pointPois, activeCategory]
  );

  // Initialize the map once Google Maps is loaded.
  useEffect(() => {
    if (!loaded || !mapDivRef.current || mapRef.current) return;

    const avgLat = pointPois.reduce((s, p) => s + p.lat, 0) / (pointPois.length || 1);
    const avgLng = pointPois.reduce((s, p) => s + p.lng, 0) / (pointPois.length || 1);

    mapRef.current = new google.maps.Map(mapDivRef.current, {
      center: { lat: avgLat, lng: avgLng },
      zoom: 12,
      streetViewControl: false,
      fullscreenControl: false,
      mapId: "DEMO_MAP_ID",
    });
    infoWindowRef.current = new google.maps.InfoWindow();
  }, [loaded, pointPois]);

  // Rebuild markers whenever the filtered set changes.
  useEffect(() => {
    if (!loaded || !mapRef.current) return;

    clustererRef.current?.clearMarkers();
    markersByPoiId.current.forEach((marker) => marker.setMap(null));
    markersByPoiId.current.clear();

    const markers = filtered.map((poi) => {
      const marker = new google.maps.Marker({
        position: { lat: poi.lat, lng: poi.lng },
        title: poi.name,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 7,
          fillColor: poi.categoryColor,
          fillOpacity: 1,
          strokeColor: "#ffffff",
          strokeWeight: 1.5,
        },
      });
      marker.addListener("click", () => {
        setSelectedPoiId(poi.id);
        infoWindowRef.current?.setContent(infoWindowHtml(poi));
        infoWindowRef.current?.open({ map: mapRef.current!, anchor: marker });
      });
      markersByPoiId.current.set(poi.id, marker);
      return marker;
    });

    clustererRef.current = new MarkerClusterer({ map: mapRef.current, markers });
  }, [loaded, filtered]);

  function focusPoi(poiId: string) {
    const poi = filtered.find((p) => p.id === poiId);
    const marker = markersByPoiId.current.get(poiId);
    if (!poi || !marker || !mapRef.current) return;
    mapRef.current.panTo({ lat: poi.lat, lng: poi.lng });
    mapRef.current.setZoom(16);
    setSelectedPoiId(poiId);
    infoWindowRef.current?.setContent(infoWindowHtml(poi));
    infoWindowRef.current?.open({ map: mapRef.current, anchor: marker });
  }

  if (error) {
    return (
      <div className="rounded-lg border p-6 text-center text-sm" style={{ borderColor: "var(--primary)" }}>
        {error}. ודאו ש-NEXT_PUBLIC_GOOGLE_MAPS_API_KEY מוגדר.
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-140px)] flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setActiveCategory(null)}
          className="rounded-full border px-3 py-1 text-sm"
          style={{
            borderColor: "var(--primary)",
            background: activeCategory === null ? "var(--primary)" : "transparent",
            color: activeCategory === null ? "white" : "var(--text)",
          }}
        >
          הכל ({pointPois.length})
        </button>
        {categoryNames.map((name) => (
          <button
            key={name}
            onClick={() => setActiveCategory(name)}
            className="rounded-full border px-3 py-1 text-sm"
            style={{
              borderColor: "var(--primary)",
              background: activeCategory === name ? "var(--primary)" : "transparent",
              color: activeCategory === name ? "white" : "var(--text)",
            }}
          >
            {name}
          </button>
        ))}
      </div>

      <div className="flex flex-1 gap-3 overflow-hidden">
        <div
          ref={mapDivRef}
          className="min-w-0 flex-1 overflow-hidden"
          style={{ borderRadius: "var(--radius)", border: "1px solid var(--primary)" }}
        />
        <div
          className="hidden w-72 shrink-0 overflow-y-auto sm:block"
          style={{ borderRadius: "var(--radius)", border: "1px solid var(--primary)", background: "var(--surface)" }}
        >
          {filtered.map((poi) => (
            <div
              key={poi.id}
              onClick={() => focusPoi(poi.id)}
              className="flex w-full cursor-pointer items-center justify-between gap-2 border-b p-3 text-start text-sm"
              style={{
                borderColor: "color-mix(in srgb, var(--primary) 15%, transparent)",
                background: selectedPoiId === poi.id ? "var(--background)" : "transparent",
              }}
            >
              <span className="flex min-w-0 flex-col gap-0.5">
                <span className="flex items-center gap-2 font-medium">
                  <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: poi.categoryColor }} />
                  <span className="truncate">{poi.name}</span>
                </span>
                <span className="ps-4 text-xs opacity-60">{poi.areaName}</span>
              </span>
              <span onClick={(e) => e.stopPropagation()}>
                <FavoriteButton poiId={poi.id} slug={slug} initialFavorited={favoritedIds.has(poi.id)} />
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
