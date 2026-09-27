"use client";

import { useEffect, useRef } from "react";

/** Makes the phone's Back button (and the browser's) close an open sheet/dialog/viewer instead of leaving the
 * screen: while `open`, one history entry is pushed, and going back pops it and calls `onClose`.
 *
 * Closing it some other way (the X, tapping outside, a link inside it navigating elsewhere) deliberately does NOT
 * try to remove that pushed entry. It's tempting to "clean up" with history.back() there so an unrelated later Back
 * press doesn't land on a redundant entry - but a link inside the sheet navigating away closes it (onClose) in the
 * very same click that starts that navigation, and Next only calls its own history.pushState once the target
 * route's data has actually arrived - which can take anywhere from a few ms to, on a slow connection, a second or
 * more. There is no delay short enough to always be "before that" and long enough to never fire before it: fire
 * first and our own history.back() wins the race and cancels Next's still-pending navigation outright (confirmed:
 * tapping a link inside a drawer/sheet silently did nothing). So this leaves the extra entry in place - the cost is
 * at most one harmless additional Back press blank-landing on the same screen later, never a swallowed navigation. */
export function useBackToClose(open: boolean, onClose: () => void) {
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    history.pushState({ ...(history.state ?? {}), travi_overlay: true }, "");
    const onPop = () => closeRef.current();
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [open]);
}
