"use client";

import { useEffect, useState } from "react";

declare global {
  interface Window {
    google?: typeof google;
  }
}

let loadPromise: Promise<void> | null = null;

/**
 * With the `loading=async` bootstrap, `google.maps.Map` etc. are NOT
 * constructors until the relevant library has been imported via
 * `google.maps.importLibrary(...)` — merely loading the bootstrap script
 * leaves `google.maps.Map` as a stub that throws "is not a constructor".
 */
function loadGoogleMaps(apiKey: string): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.google?.maps?.Map) return Promise.resolve();
  if (loadPromise) return loadPromise;

  loadPromise = new Promise((resolve, reject) => {
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

  return loadPromise;
}

let routesLoadPromise: Promise<void> | null = null;

/**
 * The "routes" library (DirectionsService/DirectionsRenderer) is optional —
 * loaded lazily on first use rather than as part of the core map bootstrap,
 * so that a project without the Directions API enabled still gets a working
 * map instead of Google's global "degraded map" auth-failure dialog.
 */
export function loadRoutesLibrary(): Promise<void> {
  if (typeof window === "undefined" || !window.google?.maps) {
    return Promise.reject(new Error("Google Maps לא נטען"));
  }
  if (routesLoadPromise) return routesLoadPromise;
  routesLoadPromise = google.maps.importLibrary("routes").then(() => undefined);
  return routesLoadPromise;
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
