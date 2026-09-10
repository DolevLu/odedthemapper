/** Google's own "This page can't load Google Maps correctly" dialog —
 * injected directly into the map's container div by their JS API itself
 * (not something our code renders) whenever a request the API makes
 * (tiles, geocoding, whatever) gets refused, e.g. by an API-key domain
 * restriction. It fires intermittently in production even though the map
 * itself keeps working underneath it, reading to users as a real error.
 * Rather than chasing which specific request the key restriction is
 * rejecting, this just watches the map container for Google's own dialog
 * appearing and hides it the instant it's inserted — matched on the
 * stable "degraded-map-dialog-view" class fragment rather than the full
 * class name, which also carries a build-hash prefix Google can change
 * between API releases. */
export function suppressMapsErrorDialog(container: HTMLElement): () => void {
  const hide = (el: Element) => {
    if (el instanceof HTMLElement && el.className.includes("degraded-map-dialog-view")) {
      el.style.display = "none";
    }
  };
  // Catches one already present (e.g. if it was inserted before this ran).
  container.querySelectorAll("*").forEach(hide);

  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      mutation.addedNodes.forEach((node) => {
        if (!(node instanceof HTMLElement)) return;
        hide(node);
        node.querySelectorAll("*").forEach(hide);
      });
    }
  });
  observer.observe(container, { childList: true, subtree: true });
  return () => observer.disconnect();
}
