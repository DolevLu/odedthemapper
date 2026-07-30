"use client";

import { useEffect, useState } from "react";

declare global {
  interface Window {
    google?: typeof google;
    __googleMapsLoadPromise?: Promise<void>;
    __googleMapsRoutesPromise?: Promise<void>;
  }
}

/**
 * Singleton load-state MUST live on `window`, never in module scope.
 * Next.js can bundle this module into more than one JS chunk (different
 * client components importing it end up in separate chunks), and each
 * chunk gets its OWN copy of a module-scoped `let` — silently defeating a
 * "load only once" guard. That was the real root cause of the recurring
 * "This page can't load Google Maps correctly" dialog: the bootstrap
 * <script> tag was getting injected many times on the same page (confirmed
 * live — 13 duplicate script tags on one page load), and Google's Maps JS
 * API does not tolerate being loaded more than once; it fails the whole
 * page with that dialog instead of a normal per-tag error. `window` is the
 * one thing guaranteed to be shared across every chunk, so state lives
 * there instead.
 */
function loadGoogleMaps(apiKey: string): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.google?.maps?.Map) return Promise.resolve();
  if (window.__googleMapsLoadPromise) return window.__googleMapsLoadPromise;

  window.__googleMapsLoadPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&loading=async&callback=__initGoogleMaps`;
    script.async = true;
    (window as unknown as Record<string, () => void>).__initGoogleMaps = () => {
      Promise.all([google.maps.importLibrary("maps"), google.maps.importLibrary("marker")])
        .then(() => resolve())
        .catch(reject);
    };
    script.onerror = () => reject(new Error("נכשלה טעינת Google Maps"));
    document.head.appendChild(script);
  });

  return window.__googleMapsLoadPromise;
}

/**
 * The "routes" library (DirectionsService/DirectionsRenderer) is optional —
 * loaded lazily on first use rather than as part of the core map bootstrap,
 * so that a project without the Directions API enabled still gets a working
 * map instead of Google's global auth-failure dialog. Same window-singleton
 * reasoning as loadGoogleMaps above.
 */
export function loadRoutesLibrary(): Promise<void> {
  if (typeof window === "undefined" || !window.google?.maps) {
    return Promise.reject(new Error("Google Maps לא נטען"));
  }
  if (window.__googleMapsRoutesPromise) return window.__googleMapsRoutesPromise;
  window.__googleMapsRoutesPromise = google.maps.importLibrary("routes").then(() => undefined);
  return window.__googleMapsRoutesPromise;
}

export function useGoogleMaps() {
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  useEffect(() => {
    if (!apiKey) return;
    loadGoogleMaps(apiKey)
      .then(() => setLoaded(true))
      .catch((err) => setLoadError(err.message));
  }, [apiKey]);

  const error = !apiKey ? "חסר מפתח Google Maps API" : loadError;
  return { loaded, error };
}
