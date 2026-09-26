"use client";

import { useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { enableNative, fetchPreference, isNativeApp } from "@/lib/pushClient";

/** In the Android app: once the visitor is logged in and hasn't switched notifications off, register this phone for
 * push (this is what makes notifications ON by default - Android shows its one-time permission dialog on first
 * launch). It re-registers on every start so a refreshed FCM token always reaches the server. Does nothing in a
 * normal browser, where the permission prompt needs a tap (Settings has the switch). */
export function PushRegistrar() {
  const { status } = useSession();
  const done = useRef(false);

  useEffect(() => {
    if (status !== "authenticated" || done.current || !isNativeApp()) return;
    done.current = true;
    (async () => {
      const enabled = await fetchPreference();
      if (enabled) await enableNative();
    })();
  }, [status]);

  return null;
}
