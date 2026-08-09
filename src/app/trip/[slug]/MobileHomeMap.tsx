"use client";

import { useSyncExternalStore } from "react";
import type { ComponentProps } from "react";
import { MapScreen } from "./map/MapScreen";

const MOBILE_QUERY = "(max-width: 639px)";

function subscribe(callback: () => void) {
  const mql = window.matchMedia(MOBILE_QUERY);
  mql.addEventListener("change", callback);
  return () => mql.removeEventListener("change", callback);
}

function getSnapshot() {
  return window.matchMedia(MOBILE_QUERY).matches;
}

function getServerSnapshot() {
  return false;
}

// Mounts the fullscreen map-first home screen only once a mobile viewport is
// confirmed client-side — keeps desktop visitors from ever loading the Maps
// SDK or getting an auto-location prompt for a view they'll never see.
export function MobileHomeMap(props: Omit<ComponentProps<typeof MapScreen>, "homeMode">) {
  const isMobile = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  if (!isMobile) return null;
  return <MapScreen {...props} homeMode />;
}
