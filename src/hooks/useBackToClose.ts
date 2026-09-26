"use client";

import { useEffect, useRef } from "react";

/** Makes the phone's Back button (and the browser's) close an open sheet/dialog/viewer instead of leaving the screen:
 * while `open`, one history entry is pushed, and going back pops it and calls `onClose`. Closing it by other means
 * (the X, a tap outside) removes that entry again so history stays tidy. */
export function useBackToClose(open: boolean, onClose: () => void) {
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    let poppedByBack = false;
    history.pushState({ ...(history.state ?? {}), travi_overlay: true }, "");
    const onPop = () => {
      poppedByBack = true;
      closeRef.current();
    };
    window.addEventListener("popstate", onPop);
    return () => {
      window.removeEventListener("popstate", onPop);
      // Closed some other way: drop the entry we added (only if it is still on top).
      if (!poppedByBack && history.state?.travi_overlay) history.back();
    };
  }, [open]);
}
