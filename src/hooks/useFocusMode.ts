"use client";

import { useEffect, useState } from "react";

// Lets the header (a server component with a small client trigger) and the
// sidebar (fully client) collapse in sync without a shared React context —
// state lives as a data attribute on <html> (which both globals.css and any
// mounted component can read) plus localStorage for persistence across
// navigations, and a custom window event so every mounted useFocusMode()
// consumer re-renders immediately when any one of them toggles it.
const ATTR = "data-focus-mode";
const EVENT = "travi:focus-mode-change";
const STORAGE_KEY = "travi-focus-mode";

export function setFocusMode(value: boolean) {
  if (typeof document === "undefined") return;
  document.documentElement.setAttribute(ATTR, value ? "true" : "false");
  try {
    localStorage.setItem(STORAGE_KEY, value ? "1" : "0");
  } catch {
    // ignore (private browsing etc.) — focus mode just won't persist
  }
  window.dispatchEvent(new CustomEvent<boolean>(EVENT, { detail: value }));
}

export function useFocusMode(): boolean {
  const [active, setActive] = useState(false);

  useEffect(() => {
    let stored = false;
    try {
      stored = localStorage.getItem(STORAGE_KEY) === "1";
    } catch {
      // ignore
    }
    setActive(stored);
    document.documentElement.setAttribute(ATTR, stored ? "true" : "false");

    function handle(e: Event) {
      setActive(Boolean((e as CustomEvent<boolean>).detail));
    }
    window.addEventListener(EVENT, handle);
    return () => window.removeEventListener(EVENT, handle);
  }, []);

  return active;
}
