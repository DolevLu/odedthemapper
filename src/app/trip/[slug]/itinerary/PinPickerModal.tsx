"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useGoogleMaps } from "@/hooks/useGoogleMaps";

/** Small centered dialog for "I want to add a stop that isn't a real
 * matched place" — a plain free-text label has no coordinates and never
 * shows on the route map (see addCustomItineraryItem), so this lets the
 * traveler drop a pin by hand instead. Portaled to document.body for the
 * same reason SettingsModal/FeedbackModal are — the sticky desktop sidebar
 * traps a plain fixed child inside its own stacking context. */
export function PinPickerModal({
  initialLabel,
  onConfirm,
  onClose,
}: {
  initialLabel: string;
  onConfirm: (lat: number, lng: number) => void;
  onClose: () => void;
}) {
  const { loaded, error } = useGoogleMaps();
  const mapDivRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.Marker | null>(null);
  const [picked, setPicked] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    if (!loaded || !mapDivRef.current || mapRef.current) return;
    mapRef.current = new google.maps.Map(mapDivRef.current, {
      center: { lat: 0, lng: 0 },
      zoom: 2,
      streetViewControl: false,
      fullscreenControl: false,
      mapTypeControl: false,
      gestureHandling: "greedy",
    });
    // Best-effort initial center on the traveler's current location, purely
    // so the map doesn't open zoomed out to the whole world — silently
    // keeps the world view if permission is denied/unavailable.
    navigator.geolocation?.getCurrentPosition(
      (pos) => mapRef.current?.setCenter({ lat: pos.coords.latitude, lng: pos.coords.longitude }) && mapRef.current?.setZoom(14),
      () => {}
    );
    mapRef.current.addListener("click", (e: google.maps.MapMouseEvent) => {
      const lat = e.latLng?.lat();
      const lng = e.latLng?.lng();
      if (lat == null || lng == null) return;
      setPicked({ lat, lng });
      if (markerRef.current) {
        markerRef.current.setPosition({ lat, lng });
      } else {
        markerRef.current = new google.maps.Marker({ position: { lat, lng }, map: mapRef.current! });
      }
    });
  }, [loaded]);

  return createPortal(
    <div className="fixed inset-0 z-[400] flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex w-full max-w-md flex-col gap-3 rounded-2xl p-5 shadow-2xl"
        style={{ background: "var(--surface)" }}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">📍 סימון מיקום על המפה</h2>
          <button onClick={onClose} className="rounded-full px-2 py-1 text-lg opacity-60" aria-label="סגירה">
            ✕
          </button>
        </div>
        <p className="text-xs opacity-60">
          {initialLabel ? `הנקודה תתווסף בשם "${initialLabel}" — לחצו על המפה כדי לבחור מיקום.` : "לחצו על המפה כדי לבחור מיקום."}
        </p>
        {error ? (
          <p className="text-sm text-red-600">{error}</p>
        ) : (
          <div ref={mapDivRef} className="h-64 w-full rounded-lg border" style={{ borderColor: "var(--primary)" }} />
        )}
        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 rounded-lg border px-3 py-2 text-sm font-semibold" style={{ borderColor: "var(--primary)", color: "var(--primary)" }}>
            ביטול
          </button>
          <button
            onClick={() => picked && onConfirm(picked.lat, picked.lng)}
            disabled={!picked}
            className="flex-1 rounded-lg px-3 py-2 text-sm font-semibold text-white disabled:opacity-40"
            style={{ background: "var(--primary)" }}
          >
            אישור מיקום
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
